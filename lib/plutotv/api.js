(function() {
	const axios = require('axios');
	const converter = require('xml-js');
	const utils = require('#lib/utils.js');

	const USERAGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15';
	let bootData = null;
	let channelList = null;
	let categoryList = null;
	let timelineList = null;

	const boot = async (region, clientID) => {
		const d = new Date;
		const clientTime = encodeURI(d.toISOString());

		const headers = {};
		if (region) headers['X-Forwarded-For'] = region;

		const resp = await axios.get(`https://boot.pluto.tv/v4/start?appName=web&appVersion=7.9.0-a9cca6b89aea4dc0998b92a51989d2adb9a9025d&deviceVersion=16.2.0&deviceModel=web&deviceMake=Chrome&deviceType=web&clientID=${clientID}&clientModelNumber=1.0.0&channelID=5a4d3a00ad95e4718ae8d8db&serverSideAds=true&constraints=&drmCapabilities=&blockingMode=&clientTime=${clientTime}`, {headers});

		bootData = resp.data;
		// fs.writeFileSync("/tmp/boot.json", JSON.stringify(bootData, null, " "));
		return bootData;
	}

	const channels = async (region) => {
		const jwt = bootData.sessionToken;

		const headers = {
			Authorization: `Bearer ${jwt}`
		};

		if (region) headers['X-Forwarded-For'] = region;

		const resp = await axios.get(`https://service-channels.clusters.pluto.tv/v2/guide/channels?channelIds=&offset=0&limit=1000&sort=number%3Aasc`, {headers});

		channelList = resp.data;
		// fs.writeFileSync("/tmp/channelsList.json", JSON.stringify(channelList, null, " "));
		return resp.data;
	}

	const categories = async (region) => {
		const jwt = bootData.sessionToken;

		const headers = {
			Authorization: `Bearer ${jwt}`
		};

		if (region) headers['X-Forwarded-For'] = region;
		const resp = await axios.get('https://service-channels.clusters.pluto.tv/v2/guide/categories', {
			headers
		});

		categoryList = resp.data;
		// fs.writeFileSync("/tmp/categoryList.json", JSON.stringify(categoryList, null, " "));
		return resp.data;
	}

	const timelines = async (region) => {
		const jwt = bootData.sessionToken;

		const headers = {
			Authorization: `Bearer ${jwt}`
		};

		if (region) headers['X-Forwarded-For'] = region;

		timelineList = { data: [] };
		for (let offset = -1; offset < 24; offset += 4) {
			const d = new Date;
			d.setHours(d.getHours() + offset);
			const channelIds = channelList.data.map(c => c.id);
			const chunkSize = 30;
			for (let i = 0; i < channelIds.length; i += chunkSize) {
				const chunks = channelIds.slice(i, i + chunkSize);
				const clientTime = encodeURI(d.toISOString());
				const resp = await axios.get(`https://service-channels.clusters.pluto.tv/v2/guide/timelines?start=${clientTime}&duration=240&channelIds=${chunks.join('%2C')}`, {headers});

				timelineList.data = timelineList.data.concat(resp.data.data);
			}
		}
		// fs.writeFileSync("/tmp/timelineList.json", JSON.stringify(timelineList, null, " "));
		// process.exit(0);
		return timelineList;
	}

	const generateM3U8 = async (
		region,
		group,
		regionalize,
		excludeGroups,
		excludeChannels,
		chno,
		xTvgUrl,
		vlcopts,
		xff,
		pipeopts
	) => {
		let numChannels = 0;
		let m3u8 = '#EXTM3U\n\n#EXTINF:-1 tvg-id="antennatv.us" tvg-name="ANTENNA TV US" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Antenna_TV_logo.png" group-title="Live TV",Antenna TV\n\http://nocable.cc:8080/live/g27psZ/919996/20180.m3u8\n\n#EXTINF:-1 tvg-id="awe.us" tvg-name="AWE" tvg-logo="http://primestreamstv.com/logos/awelogo.png" group-title="Live TV",AWE\n\bellsouth.net/drudolf@2024/326194.m3u8\n\n#EXTINF:-1 tvg-id="awe.us" tvg-name="AWE" tvg-logo="http://primestreamstv.com/logos/awelogo.png" group-title="Live TV",AWE\n\https://a-cdn.klowdtv.com/live1/awe_720p/playlist.m3u8\n\n#EXTINF:-1 tvg-id="AWE+" tvg-name="AWE Plus" tvg-logo="https://uspto.report/TM/88923573/mark.png" group-title="Live TV",AWE Plus\n\http://bgdc.live:25461/live/tommyk1933/5855009134/10364.m3u8\n\n#EXTINF:-1 tvg-id="bravo.us" tvg-name="Bravo" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Bravo_2017.png" group-title="Live TV",Bravo\n\http://4.30.180.36:8420/bravo/index.m3u8?token=test\n\n#EXTINF:-1 tvg-id="decadeswvah.us" tvg-name="Catchy Comedy" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/decades-1.png" group-title="Live TV",Catchy Comedy\n\http://bgdc.live:25461/live/deborahbowden/99126515/22435.m3u8\n\n#EXTINF:-1 tvg-id="cozitv.us" tvg-name="Cozi" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/cozi5.png" group-title="Live TV",Cozi\n\http://173.225.32.123/Cozi-2358/index.m3u8\n\n#EXTINF:-1 tvg-id="destinationamerica.us" tvg-name="Destination America" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Destination_America_2015.png" group-title="Live TV",Destination America\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/14222.m3u8\n\n#EXTINF:-1 tvg-id="fxx.us" tvg-name="FXX" tvg-logo="http://primestreamstv.com/logos/FXX%20HD.png" group-title="Live TV",FXX\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/46699.m3u8\n\n#EXTINF:-1 tvg-id="lafftv.us" tvg-name="Laff More" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/laff.jpg" group-title="Live TV",Laff More\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/17777.m3u8\\n\n#EXTINF:-1 tvg-id="metv.us" tvg-name="MeTV" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/metv.png" group-title="Live TV",MeTV\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/16149.m3u8\n\n#EXTINF:-1 tvg-id="metvplus.us" tvg-name="METV+" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/7/7e/MeTV%2B_%282021%29.png" group-title="Live TV",METV+\n\http://bgdc.live:25461/live/tommyk1933/5855009134/206833.m3u8\n\n#EXTINF:-1 tvg-id="metv.toons.us" tvg-name="MeTV Toons" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/2/2b/MeTV_Toons.png" group-title="Live TV",MeTV Toons\n\http://bgdc.live:25461/live/tommyk1933/5855009134/95324.m3u8\n\n#EXTINF:-1 tvg-id="More TV Sitcoms" tvg-name="More TV Sitcoms" tvg-logo="https://public-assets-pressexpress.s3.amazonaws.com/assets/pages/images/2024/08/01/MoreTvSitcomsPLUTO_Channel_1080x1080_HeroSquare-1824yaim.png" group-title="Live TV",More TV Sitcoms\n\https://jmp2.uk/plu-6132619f9ddaa50007e7dd86.m3u8\n\n#EXTINF:-1 tvg-id="shout.us" tvg-name="Shout! TV" tvg-logo="https://play-lh.googleusercontent.com/kLxu4FV_m4wCYbiLZTnA3CSyQImcsUrD2LST5aMqnIninqatLCbm47v9WbFNjJPwt1jFse0FJVD3zyggDKZLaV0" group-title="Live TV",Shout!TV\n\https://d1s1wrpgemt9re.cloudfront.net/Shout_TV.m3u8\n\n#EXTINF:-1 tvg-id="smithsonianchannel.us" tvg-name="Smithsonian Channel" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Smithsonian.png" group-title="Live TV",Smithsonian Channel\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/102210.m3u8\n\n#EXTINF:-1 tvg-id="tbs.us" tvg-name="TBS" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TBS_2015.png" group-title="Live TV",TBS\n\https://turnerlive.warnermediacdn.com/hls/live/2023172/tbseast/slate/VIDEO_0_3564000.m3u8\n\n#EXTINF:-1 tvg-id="tnt.us" tvg-name="TNT" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TNT_logo_1999.png" group-title="Live TV",TNT\n\https://turnerlive.warnermediacdn.com/hls/live/2023168/tnteast/slate/VIDEO_0_3564000.m3u8\n\n#EXTINF:-1 tvg-id="tvlandeast.us" tvg-name="TV LAND" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TV_Land_2015.png" group-title="Live TV",TV LAND\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/102220.m3u8\n\n#EXTINF:-1 tvg-id="TV Land Sitcoms" tvg-name="TV Land Sitcoms" tvg-logo="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9-Bq3CcDfrID7ccImoFTGl7xEp5ZMKS-lNErqafU_wg&s" group-title="Live TV",TV Land Sitcoms\n\https://jmp2.uk/plu-5c2d64ffbdf11b71587184b8.m3u8\n\n#EXTINF:-1 tvg-id="usanetwork.us" tvg-name="USA Network" tvg-logo="http://primestreamstv.com/logos/USA%20Network.png" group-title="Live TV",USA Network\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/10252.m3u8\n\n#EXTINF:-1 tvg-id="foxnews.us" tvg-name="Fox News Channel" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/foxnews.png" group-title="Locals",Fox News\n\http://tkosportz.live:25461/live/mariaores/26845656/31182.m3u8\n\n#EXTINF:-1 tvg-id="weatherchannel.us" tvg-name="The Weather Channel" tvg-logo="http://163.172.89.228/~msepg/logos/united-states/weather-channel-us.png" group-title="Locals",The Weather Channel\n\http://tkosportz.live:25461/live/mariaores/26845656/10449.m3u8\n\n#EXTINF:-1 tvg-id="abcwcvb.us" tvg-name="ABC Boston (WCVB)" tvg-logo="https://static.wikia.nocookie.net/logopedia/images/a/a8/WCVB_2008.png/revision/latest?cb=20211003190252" group-title="Locals",ABC Boston (WCVB)\n\http://tkosportz.live:25461/live/mariaores/26845656/216046.m3u8\n\n#EXTINF:-1 tvg-id="cbs4wbz.us" tvg-name="CBS Boston (WBZ)" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/7/70/WBZ-TV_logo.png" group-title="Locals",CBS Boston (WBZ)\n\http://tkosportz.live:25461/live/mariaores/26845656/215445.m3u8\n\n#EXTINF:-1 tvg-id="cbs6wtvr.us" tvg-name="CBS 6 Richmond (WTVR)" tvg-logo="https://banner2.kisspng.com/20180720/fxa/kisspng-cbs-6-wtvr-tv-logo-brand-prince-william-public-library-system-5b52901586b827.5369758315321374935518.jpg" group-title="Locals",CBS 6 Richmond (WTVR)\n\http://myxpanel.pro:80/live/edc/edc/295600.m3u8\n\n#EXTINF:-1 tvg-id="fox25wfxt.us" tvg-name="FOX Boston (WFXT)" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/2/25/Wfxt_2011.png" group-title="Locals",FOX Boston (WFXT)\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/324543.m3u8\n\n#EXTINF:-1 tvg-id="nbc12wwbt.us" tvg-name="NBC 12 (WWBT) Richmond" tvg-logo="https://www.pngfind.com/pngs/m/304-3049903_event-partners-nbc-12-transparent-logo-hd-png.png" group-title="Locals",NBC 12 (WWBT) Richmond\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/324750.m3u8\n\n#EXTINF:-1 tvg-id="abcwabc.us" tvg-name="ABC EAST" tvg-logo="http://primestreamstv.com/logos/ABC.png" group-title="Locals",ABC EAST\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/22990.m3u8\n\n#EXTINF:-1 tvg-id="cbs.us" tvg-name="CBS EAST" tvg-logo="https://logos-world.net/wp-content/uploads/2020/08/CBS-Logo.png" group-title="Locals",CBS EAST\n\http://4.30.180.36:8420/cbs/index.m3u8?token=test\n\n#EXTINF:-1 tvg-id="cbs.us" tvg-name="CBS EAST" tvg-logo="https://logos-world.net/wp-content/uploads/2020/08/CBS-Logo.png" group-title="Locals",CBS EAST\n\http://myxpanel.pro:80/live/ada/ada/253197.m3u8\n\n#EXTINF:-1 tvg-id="cw.us" tvg-name="CW EAST" tvg-logo="https://docdog.top/logo/countries/us/cw.png" group-title="Locals",CW EAST\n\http://bgdc.live:25461/live/deborahbowden/99126515/48476.m3u8\n\n#EXTINF:-1 tvg-id="fox.us" tvg-name="FOX EAST" tvg-logo="https://docdog.top/logo/countries/us/fox.png" group-title="Locals",FOX EAST\n\http://stream.cammonitorplus.net/1752/index.m3u8\n\n#EXTINF:-1 tvg-id="nbcwnbc.us" tvg-name="NBC EAST" tvg-logo="http://primestreamstv.com/logos/NBC.png" group-title="Locals",NBC EAST\n\http://stream.cammonitorplus.net/1785/index.m3u8\n\n#EXTINF:-1 tvg-id="cookingchannel.us" tvg-name="Cooking Channel" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Cooking_Channel.png" group-title="Home + Food",Cooking Channel\n\http://bgdc.live:25461/live/tommyk1933/5855009134/10381.m3u8\n\n#EXTINF:-1 tvg-id="cookingchannel.us" tvg-name="Cooking Channel HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Cooking_Channel.png" group-title="Home + Food",Cooking Channel HD \n\http://23.237.104.106:8080/USA_COOKING/index.m3u8\n\n#EXTINF:-1 tvg-id="foodnetwork.us" tvg-name="Food Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/FoodNetLogo.png" group-title="Home + Food",Food Network\n\http://4.30.180.36:8420/foodnetwork/index.m3u8?token=test\n\n#EXTINF:-1 tvg-id="foodnetwork.us" tvg-name="Food Network HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/FoodNetLogo.png" group-title="Home + Food",Food Network HD\n\http://bgdc.live:25461/live/tommyk1933/5855009134/10393.m3u8\n\n#EXTINF:-1 tvg-id="BBC Home & Garden (1080p)" tvg-name="BBC Home & Garden" tvg-logo="https://i.imgur.com/rC0pi1D.png" group-title="Home + Food",BBC Home & Garden\n\https://d11r33s5i066xh.cloudfront.net/playlist.m3u8\n\n#EXTINF:-1 tvg-id="hgtv.us" tvg-name="HGTV" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Home_Garden_Television.png" group-title="Home + Food",HGTV\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/46717.m3u8\n\n#EXTINF:-1 tvg-id="hgtv.us" tvg-name="HGTV" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Home_Garden_Television.png" group-title="Home + Food",Home Network\n\http://ultratv.one:2095/live/hCPtsREFtA/Xj25tg0ZXi/2124581.m3u8\n\n#EXTINF:-1 tvg-id="homemadenation.us" tvg-name="Home Made Nation" tvg-logo="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfrF0OHOneIhv6P_Zb-e-RYgfNhztn9FpAVB3zFG_M6A&s=10" group-title="Home + Food",Home Made Nation\n\https://jmp2.uk/plu-5dc1cb279c91420009db261d.m3u8\n\n#EXTINF:-1 tvg-id="Homeful.us" tvg-name="Homeful" tvg-logo="https://homefultv.com/wp-content/uploads/2023/03/Homeful_Logo_MintWhite-1280x324.png" group-title="Home + Food",Homeful\n\https://amg00090-blueantcanada-amg00090c4-samsung-au-819.playouts.now.amagi.tv/playlist/amg00090-blueantfast-homefulworldwide-samsungau/playlist.m3u8\n\n#EXTINF:-1 tvg-id="tvg-name="magnolianetwork.us.us" tvg-name="DIY Network" tvg-logo="http://163.172.89.228/~msepg/logos/united-states/weather-channel-us.png" group-title="Home + Food",DIY Network\n\http://bgdc.live:25461/live/tommyk1933/5855009134/10390.m3u8\n\n#EXTINF:-1 tvg-id="magnolianetwork.us" tvg-name="Magnolia Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/DIY_Network.png" group-title="Home + Food",Magnolia Network\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/10503.m3u8\n\n#EXTINF:-1 tvg-id="NBCLX.us@SD" tvg-name="NBC LX Home" tvg-logo="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSc8AXuZoH-p8WZD8lgHNZcq0VeyremC_ZqdFmJKyfNEQ&s" group-title="Home + Food",NBC LX Home\n\https://nbculocallive.akamaized.net/hls/live/2037096/lx/use1.m3u8\n\n#EXTINF:-1 tvg-id="Tastemade.Home.us" tvg-name="Tastemade Home" tvg-logo="https://m.media-amazon.com/images/G/01/digital/video/Linear_Clean_Slate/Carbon_Integration_Station_Image_Update/16x9_TMHomeLogo_FreeVee.png" group-title="Home + Food",Tastemade Home\n\https://d3ca4qxsdzlrju.cloudfront.net/Tastemade_Home.m3u8\n\n#EXTINF:-1 tvg-id="WBTV" tvg-name="24/7 - WB Welcome Home" tvg-logo="https://www.imdb.com/title/tt8992540/mediaviewer/rm306803200/?ref_=tt_ov_i" group-title="Home + Food",24/7 - WB Welcome Home\n\https://live-manifest.production-public.tubi.io/live/edb986fe-9600-4f83-8b6d-8593986f2f3a/playlist.m3u8\n\n#EXTINF:-1 tvg-id="643f03b9d8436e0008edf021" tvg-name="Family Feud Classic" tvg-logo="https://images.pluto.tv/channels/643f03b9d8436e0008edf021/colorLogoPNG.png" group-title="Gameshows",Family Feud Classic\n\https://amg00145-amg00145c3-xumo-us-3802.playouts.now.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="ThePriceIsRightTheBarkerEra.us@SD" tvg-name="The Price is Right: The Barker Era" tvg-logo="https://images.pluto.tv/channels/5f7791b8372da90007fd45e6/colorLogoPNG.png" group-title="Gameshows",The Price is Right: The Barker Era\n\https://amg00145-buzzr-bigballs-tpir-8min-rokuus-otcre.amagi.tv/playlist/amg00145-buzzr-bigballs-tpir-8min-rokuus/playlist.m3u8\n\n#EXTINF:-1 tvg-id="Supermarket Sweep" tvg-name="Supermarket Sweep" tvg-logo="https://images.pluto.tv/channels/649ddbfb6f29ec000874ca9e/colorLogoPNG.png" group-title="Gameshows",Supermarket Sweep\n\https://amg00145-letsplayinc-supermarketswep-xumo-59bvy.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="gameshownetwork.us@East" tvg-name="Gameshow Network" tvg-logo="https://static.epg.best/us/GameShowNetwork.us.png" group-title="Gameshows",GameShow Network\n\http://lunar.pm:8080/live/WillieC2/Ahoskie4943/9184.m3u8\n\n#EXTINF:-1 tvg-id="amc.us" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/AMC_logo_2019.svg/960px-AMC_logo_2019.svg.png" group-title="Movies",AMC\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/18925.m3u8\n\n#EXTINF:-1 tvg-id="freeform.us" tvg-name="Freeform" tvg-logo="http://primestreamstv.com/logos/Freeform%20TV.png" group-title="Movies",Freeform\n\http://tkosportz.live:25461/live/deborahbowden/99126515/10398.m3u8\n\n#EXTINF:-1 tvg-id="freeform.us" tvg-name="Freeform" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Freeform_2018.png" group-title="Movies",Freeform\n\http://4.30.180.36:8420/freeform/index.m3u8?token=test\n\n#EXTINF:-1 tvg-id="fx.us" tvg-name="FX" tvg-logo="http://primestreamstv.com/logos/FX.png" group-title="Movies",FX\n\http://23.237.104.106:8080/USA_FX/index.m3u8\n\n#EXTINF:-1 tvg-id="fx.us" tvg-name="FX" tvg-logo="http://primestreamstv.com/logos/FX.png" group-title="Movies",FX\n\http://4.30.180.36:8420/fx/index.m3u8?token=test\n\n#EXTINF:-1 tvg-id="fxm.us" tvg-name="FX Movies HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/fxm1111.png" group-title="Movies",FX Movies HD\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/10260.m3u8\n\n#EXTINF:-1 tvg-id="fxmoviechannel.us" tvg-name="FX Movies" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/fxm1111.png" group-title="Movies",FX Movies\n\http://bgdc.live:25461/live/deborahbowden/99126515/10401.m3u8\n\n#EXTINF:-1 tvg-id="GAC - Great American Family" tvg-name="Great American Family" tvg-logo="http://163.172.89.228/~msepg/logos/united-states/great-american-country-us.png" group-title="Movies",Great American Family\n\bellsouth.net/drudolf@2024/17640.m3u8\n\n#EXTINF:-1 tvg-id="hallmark.us" tvg-name="Hallmark Channel" tvg-logo="http://primestreamstv.com/logos/Hallmark.png" group-title="Movies",Hallmark Channel\n\http://bgdc.live:25461/live/tommyk1933/5855009134/10407.m3u8\n\n#EXTINF:-1 tvg-id="hallmark.us" tvg-name="Hallmark Channel" tvg-logo="http://primestreamstv.com/logos/Hallmark.png" group-title="Movies",Hallmark Channel\n\http://23.237.104.106:8080/USA_HALLMARK/index.m3u8\n\n#EXTINF:-1 tvg-id="hallmarkfamily.us" tvg-name="Hallmark Family" tvg-logo="https://cdn.movieguide.org/wp-content/uploads/2024/02/Screen-Shot-2024-02-21-at-1.38.54-PM.jpeg" group-title="Movies",Hallmark Family\n\http://bgdc.live:25461/live/deborahbowden/99126515/10408.m3u8\n\n#EXTINF:-1 tvg-id="hallmarkmoviesmysteries.us" tvg-name="Hallmark Movies & More" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Hallmark_Movie-more.png" group-title="Movies",Hallmark Movies & More\n\https://dbrb49pjoymg4.cloudfront.net/v1/master/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod_default_xumo-ams-aws/master.m3u8?ads.xumo_channelId=99991709\n\n#EXTINF:-1 tvg-id="Hi-YAH.us" tvg-logo="https://i.imgur.com/sOYAnTB.png" group-title="Movies",Hi-YAH!\n\https://linear-59.frequency.stream/dist/plex/59/hls/master/playlist.m3u8\n\n#EXTINF:-1 tvg-id="Miramax Movies" tvg-name="Miramax Movies" tvg-logo="https://images.plex.tv/photo?size=large-1920&scale=1&url=https%3A%2F%2Fprovider-static.plex.tv%2Fepg%2Fcms%2Fproduction%2F39d7cc81-90e2-4ffa-a5f3-8cdc69c86db6%2FMIRAMAX_LOGO_VARIATION_2_-_Gabe_Evans.png" group-title="Movies",Miramax Movies\n\https://pb-w5d3w3kisxahy.akamaized.net/playlist.m3u8\n\n#EXTINF:-1 tvg-id="MovieSphere.us" tvg-name="MovieSphere" tvg-logo="https://images-cdn2.welcomesoftware.com/assets/Moviesphere-hero.png/Zz0zZmZmOWIxMmExNGUxMWVmYTUwY2FlYmM1NTY3YTAzZA==?width=880&height=494" group-title="Movies",MovieSphere\n\https://aegis-cloudfront-1.tubi.video/8b127a5b-3054-4f39-93a2-1c4aab9ef5ff/playlist.m3u8\n\n#EXTINF:-1 tvg-id="paramountnetwork.us" tvg-name="Paramount Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Paramount_Network.png" group-title="Movies",Paramount Network\n\http://bgdc.live:25461/live/deborahbowden/99126515/10439.m3u8\n\n#EXTINF:-1 tvg-id="PBSAntiquesRoadshow" tvg-name="PBSAntiquesRoadshow" tvg-logo="https://www.pbs.org/wgbh/roadshow/media/original_images/ANRO_Detours-SigImage_CR12543_1920x1080_F1.png" group-title="24/7 Shows",24/7 - Antiques Roadshow PBS\n\https://amg00953-pbsusa-antiroadshow-xumo-x6ud5.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="AntiquesRoadshowUK" tvg-name="Antiques Roadshow UK" tvg-logo="https://upload.wikimedia.org/wikipedia/en/thumb/a/a0/Antiques_Roadshow_%28title_card%29.jpg/250px-Antiques_Roadshow_%28title_card%29.jpg" group-title="24/7 Shows",24/7 - Antiques Roadshow UK\n\https://bbc-antiquesroadshowuk-1-us.xumo.wurl.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="66ba495ffe11e5000881f049" tvg-name="Cheers + Frasier"  tvg-logo="https://images.pluto.tv/channels/66ba495ffe11e5000881f049/colorLogoPNG.png" group-title="24/7 Shows",24/7 - Cheers + Frasier\n\https://jmp2.uk/plu-66ba495ffe11e5000881f049.m3u8\n\n#EXTINF:-1 tvg-id="Chips" tvg-name="https://chips-tv.com/wiki/images/9/97/CHiPsLogo.jpg" group-title="24/7 Shows",24/7 - CHiPs\n\http://myxpanel.pro/live/bree/bree/89403.m3u8\n\n#EXTINF:-1 tvg-id="keepingapearances.uk" tvg-name="24/7 - Keeping Up Appearances" tvg-logo="https://247hosting.xyz/images/247/Keeping.Up.Appearances.jpg" group-title="24/7 Shows",24/7 - Keeping Up Appearances\n\http://lunar.pm:8080/live/WillieC2/Ahoskie4943/134177.m3u8\n\n#EXTINF:-1 tvg-id="thedukesofhazzard.us" tvg-name="24/7 - The Dukes of Hazzard" tvg-logo="https://247hosting.xyz/images/247/The.Dukes.of.Hazzard.jpg" group-title="24/7 Shows",24/7 - The Dukes of Hazzard\n\http://myxpanel.pro/live/bree/bree/89323.m3u8\n\n#EXTINF:-1 tvg-id="TheLoveBoat.us@SD" tvg-logo="https://images.pluto.tv/channels/62e91563ce7ce300076f917e/colorLogoPNG.png" group-title="24/7 Shows",24/7 - The Love Boat\n\https://jmp2.uk/plu-654a4fe9056b9700088804a0.m3u8\n\n#EXTINF:-1 tvg-id="Munsters" tvg-name="24/7 - The Munsters" tvg-logo="https://image.tmdb.org/t/p/original/zC1aY5o2c0ZCyqx43uboJMqbXhS.png" group-title="24/7 Shows",24/7 - The Munsters\n\http://myxpanel.pro:80/live/edc/edc/89314.m3u8\n\n#EXTINF:-1 tvg-id="3 Stooges" tvg-name="24/7 - The Three Stooges+" tvg-logo="http://teemorris.com/wp-content/uploads/2010/12/Stoogelogo.png" group-title="24/7 Shows",24/7 - The Three Stooges+\n\https://amg02451-c3-amg02451c1-vizio-us-3670.playouts.now.amagi.tv/playlist/amg02451-c3entertainmentinc-thethreestooges-vizious/playlist.m3u8\n\n#EXTINF:-1 tvg-id="5ef3977e5d773400077de284" tvg-name="24/7 - Threes Company" tvg-logo="https://images.pluto.tv/channels/5ef3977e5d773400077de284/colorLogoPNG_1731835807101.png" group-title="24/7 Shows", 24/7 - Threes Company\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/99933.m3u8\n\n#EXTINF:-1 tvg-id="accnetwork.us" tvg-name="ACC Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/ACC_Network_ESPN.png" group-title="Sports",ACC Network\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/9273.m3u8\n\n#EXTINF:-1 tvg-id="" tvg-name="ATLANTA BRAVES" tvg-logo="https://img.mlbstatic.com/mlb-images/image/upload/t_4x1/t_w1024/v1775155466/mlb/iefkclr3ijprh82tt4t9.png" group-title="Sports",ATLANTA BRAVES\n\http://bgdc.live:25461/live/deborahbowden/99126515/99215.m3u8\n\n#EXTINF:-1 tvg-id="espn.us" tvg-name="ESPN" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/espn.png" group-title="Sports",ESPN\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/14197.m3u8\n\n#EXTINF:-1 tvg-id="espn2.us" tvg-name="ESPN 2" tvg-logo="http://onlytimewilltell.xyz:2086/images/017f41a2ef4ff9d39f45f680b88cd23b.png" group-title="Sports",ESPN 2\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/2210.m3u8\n\n#EXTINF:-1 tvg-id="espnnews.us" tvg-name="ESPN News" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/espnnews.png" group-title="Sports",ESPN News\n\http://41.205.93.154/ESPNNEWS/index.m3u8\n\n#EXTINF:-1 tvg-id="espnu.us" tvg-name="ESPN U" tvg-logo="https://static.epg.best/us/ESPNU.us.png" group-title="Sports",ESPN U\n\http://85.237.89.160:9590/usa-s/ESPN-U-HD/index.m3u8\n\n#EXTINF:-1 tvg-id="foxsports1.us" tvg-name="Fox Sports 1" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/foxfs1.png" group-title="Sports",US FOX Sports 1\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/46792.m3u8\n\n#EXTINF:-1 tvg-id="foxsports1.us" tvg-name="Fox Sports 1 HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/foxfs1.png" group-title="Sports",Fox Sports 1 HD\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/1846.m3u8\n\n#EXTINF:-1 tvg-id="foxsports2.us" tvg-name="Fox Sports 2" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/foxfs2.png" group-title="Sports",Fox Sports 2\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/1847.m3u8\n\n#EXTINF:-1 tvg-id="masn.us" tvg-name="Mid Atlantic Sports Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/MASN-Logo.png" group-title="Sports",MASN\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/97420.m3u8\n\n#EXTINF:-1 tvg-id="masn2.us" tvg-name="Mid Atlantic Sports Network 2 HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/masn2.png" group-title="Sports",US MASN2 HD\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/97421.m3u8\n\n#EXTINF:-1 tvg-id="mlbnetwork.us" tvg-name="MLB Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/mlb.png" group-title="Sports",MLB Network\n\http://bgdc.live:25461/live/deborahbowden/99126515/99231.m3u8\n\n#EXTINF:-1 tvg-id="mlbnetwork.us" tvg-name="MLB Network HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/mlb.png" group-title="Sports",MLB Network HD\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/323887.m3u8\n\n#EXTINF:-1 tvg-id="nauticalchannel.us" tvg-name="Nautical Channel" tvg-logo="https://upload.wikimedia.org/wikipedia/fr/b/be/Nautical_Channel.png" group-title="Sports", Nautical Channel\n\https://a-cdn.klowdtv.com/live2/nautical_720p/playlist.m3u8\n\n#EXTINF:-1 tvg-id="newenglandsportsnetwork.us" tvg-name="NESN HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/NESN.png" group-title="Sports",NESN HD\n\http://tkosportz.live:25461/live/mariaores/26845656/8821.m3u8\n\n#EXTINF:-1 tvg-id="newenglandsportsnetwork.us" tvg-name="NESN HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/NESN.png" group-title="Sports",NESN HD\n\http://bgdc.live:25461/live/deborahbowden/99126515/8821.m3u8\n\n#EXTINF:-1 tvg-id="New England Sports Network Plus" tvg-name="NESN +" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/c/c2/Nesnplus.png" group-title="Sports",NESN+\n\http://cord-cutter.net:8080/live/aliciabutcher@gmail.com/CmKRbFkf2r/161451.m3u8\n\n#EXTINF:-1 tvg-id="nflnetwork.us" tvg-name="NFL NETWORK" tvg-logo="http://primestreamstv.com/logos/NFL.png" group-title="Sports",NFL NETWORK\n\http://23.237.104.106:8080/USA_NFL_NETWORK/tracks-v1a1/mono.m3u8\n\n#EXTINF:-1 tvg-id="nflnetwork.us" tvg-name="NFL NETWORK HD" tvg-logo="http://primestreamstv.com/logos/NFL.png" group-title="Sports",NFL NETWORK HD\n\http://bgdc.live:25461/live/deborahbowden/99126515/2703.m3u8\n\n#EXTINF:-1 tvg-id="TSN1.ca@SD" tvg-name="TSN 1" tvg-logo="http://primestreamstv.com/logos/TSN%201.png" group-title="Sports",TSN 1\n\http://tkosportz.live:25461/live/deborahbowden/99126515/38236.m3u8\n\n#EXTINF:-1 tvg-id="TSN2.ca@SD" tvg-name="TSN 2" tvg-logo="http://primestreamstv.com/logos/TSN%202.png" group-title="Sports",TSN 2\n\http://tkosportz.live:25461/live/deborahbowden/99126515/38237.m3u8\n\n#EXTINF:-1 tvg-id="TSN3.ca@SD" tvg-name="TSN 3" tvg-logo="http://primestreamstv.com/logos/TSN%203.png" group-title="Sports",TSN 3\n\http://tkosportz.live:25461/live/deborahbowden/99126515/38238.m3u8\n\n#EXTINF:-1 tvg-id="TSN4.ca@SD" tvg-name="TSN 4" tvg-logo="http://primestreamstv.com/logos/TSN%204.png" group-title="Sports",TSN 4\n\http://tkosportz.live:25461/live/deborahbowden/99126515/38239.m3u8\n\n#EXTINF:-1 tvg-id="TSN5.ca@SD" tvg-name="TSN 5" tvg-logo="http://primestreamstv.com/logos/TSN%205.png" group-title="Sports",TSN 5\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/102495.m3u8\n\n#EXTINF:-1 tvg-id="4K.travel.us" tvg-name="4K Travel" tvg-logo="https://vcz-ktest2-cloud-vodlix-com.b-cdn.net/u/ktest2/files/thumbs/2024/04/08/1712612339bhKq2lZNGi-original-I5f7f5UE.png" group-title="Travel",4K Travel\n\https://streams2.sofast.tv/sofastplayout/33c31ac4-51fa-46ae-afd0-0d1fe5e60a80_0_HLS/master.m3u8\n\n#EXTINF:-1 tvg-id="gousatv.us" tvg-name="GoUSA TV" tvg-logo="https://i.imgur.com/x90ALip.png" group-title="Travel",GoUSA TV\n\https://brandusa-gousa-1-be.samsung.wurl.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="GoTraveler.us" tvg-name="Go Traveler" tvg-logo="https://i.imgur.com/IaRcN1G.png" group-title="Travel",Go Traveler\n\https://amg09501-amg09501c1-klowdtv-us-2398.playouts.now.amagi.tv/playlist/amg09501-quester-gotraveler-klowdtvus/playlist.m3u8\n\n#EXTINF:-1 tvg-id="INTRAVEL.nl@Philippines" tvg-name="InTravel" tvg-logo="https://cdn.uc.assets.prezly.com/731574b6-2dab-4d87-85cf-fa48648b845a/" group-title="Travel",INTRAVEL\n\https://amg00861-amg00861c10-firetv-us-4726.playouts.now.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="PBSTravel.us@SD" tvg-name="PBS Travel" tvg-logo="https://i.imgur.com/A6GXhta.png" group-title="Travel",PBS Travel\n\https://d3hqevbyoxtkoi.cloudfront.net/PBS_Travel.m3u8\n\n#EXTINF:-1 tvg-id="tvstraveler.us" tvg-name="TVS Traveler" tvg-logo="https://i.imgur.com/IaRcN1G.png" group-title="Travel",TVS Traveler\n\https://rpn.bozztv.com/gusa/gusa-tvstravel/index.m3u8\n\n#EXTINF:-1 tvg-id="TastemadeTravel.us" tvg-name="Tastemade Travel" tvg-logo="https://static.wixstatic.com/media/64d944_4be978579b3c4fad85bed6ed975bb81d~mv2.png/v1/fit/w_360,h_640,q_90,enc_avif,quality_auto/64d944_4be978579b3c4fad85bed6ed975bb81d~mv2.png" group-title="Travel",Tastemade Travel\n\https://tm-tmtar-xumo.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="TastemadeTravel.us" tvg-name="Tastemade Travel" tvg-logo="https://static.wixstatic.com/media/64d944_4be978579b3c4fad85bed6ed975bb81d~mv2.png/v1/fit/w_360,h_640,q_90,enc_avif,quality_auto/64d944_4be978579b3c4fad85bed6ed975bb81d~mv2.png" group-title "Travel",Tastemade Travel\n\https://d6ef3usc6d9cl.cloudfront.net/Tastemade_Travel.m3u8\n\n#EXTINF:-1 tvg-id="WB Travel+Adventure" tvg-logo="https://canvas-lb.tubitv.com/opts/c6ExCQMtlVF-oA==/c2a8988f-3fff-4de6-b3b1-e8cabee3b787/CPwDEJ0COgUxLjEuOQ==" group-title="Travel",WB Travel+Adventure\n\https://live-manifest.production-public.tubi.io/live/399519f7-b848-4c8e-aaac-884546a1d916/playlist.m3u8\n\n#EXTINF:-1 tvg-id="bbc.one.gb" tvg-name="UK: BBC One" tvg-logo="https://images.seeklogo.com/logo-png/46/1/bbc-one-logo-png_seeklogo-467177.png" group-title="UK",UK: BBC One\n\http://41.205.93.154/BBCONE/index.m3u8\n\n#EXTINF:-1 tvg-id="bbc2.uk" tvg-name="UK: BBC Two" tvg-logo="https://docdog.top/logo/countries/uk/bbc2.png" group-title="UK",UK: BBC Two\n\http://41.205.93.154/BBCTWO/index.m3u8\n\n#EXTINF:-1 tvg-id="bbc3.uk" tvg-name="UK: BBC Three" tvg-logo="https://docdog.top/logo/countries/uk/bbc3.png" group-title="UK",UK: BBC Three\n\http://bgdc.live:25461/live/tommyk1933/5855009134/246632.m3u8\n\n#EXTINF:-1 tvg-id="channel4.uk" tvg-name="UK: Channel 4" tvg-logo="https://docdog.top/logo/countries/uk/channel4.png" group-title="UK",UK: Channel 4\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/99138.m3u8\n\n#EXTINF:-1 tvg-id="channel5.uk" tvg-name="UK: Channel 5" tvg-logo="https://docdog.top/logo/countries/uk/channel5.png" group-title="UK",UK: Channel 5\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/53653.m3u8\n\n#EXTINF:-1 tvg-id="" tvg-name="UK: EDEN" tvg-logo="https://docdog.top/logo/countries/uk/eden.png" group-title="UK",UK: EDEN\n\http://tkosportz.live:25461/live/deborahbowden/99126515/246667.m3u8\n\n#EXTINF:-1 tvg-id="ITV1 Channel Television" tvg-name="ITV 1" tvg-logo="http://163.172.89.228/~msepg/logos/united-kingdom/itv-uk.png" group-title="UK",UK: ITV 1\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/53651.m3u8\n\n#EXTINF:-1 tvg-id="ITV2 HD" tvg-name="ITV 2" tvg-logo="http://163.172.89.228/~msepg/logos/united-kingdom/itv-2-uk.png" group-title="UK",UK: ITV2\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/53671.m3u8\n\n#EXTINF:-1 tvg-id="ITV3 HD" tvg-name="ITV 2" tvg-logo="http://163.172.89.228/~msepg/logos/united-kingdom/itv-3-uk.png" group-title="UK",UK: ITV3\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/53655.m3u8\n\n#EXTINF:-1 tvg-id="itv4.uk" tvg-name="UK: ITV4" tvg-logo="https://www.pngfind.com/pngs/m/345-3451970_itv-3-logo-png-png-download-itv-4.png" group-title="UK",UK: ITV4\n\http://tkosportz.live:25461/live/deborahbowden/99126515/246702.m3u8\n\n#EXTINF:-1 tvg-id="more4.uk" tvg-name="UK: More 4" tvg-logo="https://upload.wikimedia.org/wikipedia/en/e/e6/More4_logo_2018.svg" group-title="UK",UK: More 4\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/106972.m3u8\n\n#EXTINF:-1 tvg-id="" tvg-name="UK: RTE 1" tvg-logo="https://docdog.top/logo/countries/uk/rteone.png" group-title="UK",UK: RTE 1\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/107017.m3u8\n\n#EXTINF:-1 tvg-id="" tvg-name="UK: RTE 2" tvg-logo="https://docdog.top/logo/countries/uk/rtetwo.png" group-title="UK",UK: RTE 2\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/107018.m3u8\n\n#EXTINF:-1 tvg-id="sky1.uk" tvg-name="UK: SKY 1" tvg-logo="https://docdog.top/logo/countries/uk/skyone.png" group-title="UK",UK: SKY 1\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/109063.m3u8\n\#EXTINF:-1 tvg-id="sky2.uk" tvg-name="UK: SKY 2" tvg-logo="https://docdog.top/logo/countries/uk/sky2.png" group-title="UK",UK: SKY 2\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/109064.m3u8\n\n#EXTINF:-1 tvg-id="skyfamily.uk" tvg-name="UK: Sky Family" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/1/1f/Sky_Cinema_Family.png" group-title="UK",UK: Sky Family\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/109051.m3u8\n\n#EXTINF:-1 tvg-id="virgin1.uk" tvg-name="UK: Virgin Media 1" tvg-logo="https://docdog.top/logo/countries/uk/virginmedia1.png" group-title="UK",UK: Virgin Media 1\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/107019.m3u8\n\n#EXTINF:-1 tvg-id="virgin2.uk" tvg-name="UK: Virgin Media 2" tvg-logo="https://docdog.top/logo/countries/uk/virginmedia2.png" group-title="UK",UK: Virgin Media 2\n\http://31.43.191.125:8080/live/VIP019301734188047280/7bce5254f13d/1749.m3u8\n\n#EXTINF:-1 tvg-id="virgin3.uk" tvg-name="UK: Virgin Media 3" tvg-logo="https://docdog.top/logo/countries/uk/virginmedia3.png" group-title="UK",UK: Virgin Media 3\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/107020.m3u8\n\n#EXTINF:-1 tvg-id="yesterday.uk" tvg-name="UK: Yesterday" tvg-logo="https://docdog.top/logo/countries/uk/yesterday.png" group-title="UK",UK: Yesterday\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/107015.m3u8\n\n';
		
		if (xTvgUrl) {
			m3u8 = `#EXTM3U x-tvg-url="${xTvgUrl}"\n\n`;
		}

		for (let i = 0; i < channelList.data.length; i++) {
			const c = channelList.data[i];

			if (!c.categoryIDs) {
				console.log("WARN: channel has no category ids", c.id, c.name);
				continue;
			}

			const category = categoryList.data.find(cat => cat.id === c.categoryIDs[0]);
			const catname = group === 'genre' ?  category.name : region;

			if (excludeGroups && new RegExp(excludeGroups).test(category.name)) continue;
			if (excludeChannels && new RegExp(excludeChannels).test(c.name)) continue;

			const tvgChno = chno !== false ? chno : c.number;
			const id = c.id + (regionalize && region ? '-' + region : '');
			// old v1 -> let url = bootData.servers.stitcher + c.stitched.path + '?' + bootData.stitcherParams;
			let url = `${bootData.servers.stitcher}/v2${c.stitched.path}?${bootData.stitcherParams}&jwt=${bootData.sessionToken}&masterJWTPassthrough=true`;
			if (vlcopts) {
				if (xff) m3u8 += `#EXTVLCOPT:http-referrer=${xff}\n`;
				m3u8 += `#EXTVLCOPT:http-user-agent=${USERAGENT}\n`;
			} else if (pipeopts) {
				if (xff) url += `|x-forwarded-for="${xff}"`;
				url += `|http-user-agent="${USERAGENT}"`;
			}

			m3u8 += `#EXTINF:-1 tvg-id="${id}" tvg-logo="${c.images[0].url}" tvg-chno="${tvgChno}" group-title="${catname}", ${c.name}\n${url}\n\n`;

			if (chno !== false) chno++;
			numChannels++;
		}
		return { m3u8, numChannels };
	}

	const generateXMLTV = async (region, regionalize) => {
		const obj = {
			"_declaration": {
				"_attributes": {
					"version": "1.0",
					"encoding": "UTF-8"
				}
			},
			"_doctype": "tv SYSTEM \"xmltv.dtv\"",
			"tv": {
				"_attributes": {
					"source-info-name": "nobody,xmltv.net,nzxmltv.com"
				},
				"channel": [],
				"programme": []
			}
		};

		for (let i = 0; i < channelList.data.length; i++) {
			const c = channelList.data[i];

			if (!c.categoryIDs) {
				console.log("WARN: channel has no category ids", c.id, c.name);
				continue;
			}

			const category = categoryList.data.find(cat => cat.id === c.categoryIDs[0]);
			const channel = {
				"_attributes": {
					"id": c.id + (regionalize && region ? '-' + region : '')
				},  
				"display-name": {
					"_text": c.name
				},  
				"lcn": {
					"_text": c.number
				},
				"icon": {
					"_attributes": {
						"src": utils.escapeHTML(c.images[0].url)
					}
				}
			};
			obj.tv.channel.push(channel);
		}

		const getTimeStr = (d) => {
			let timeStr = "";
			const year = d.getUTCFullYear();
			const mon = d.getUTCMonth() + 1;
			const day = d.getUTCDate();
			const hour = d.getUTCHours();
			const min = d.getUTCMinutes();
			const sec = d.getUTCSeconds();

			timeStr += year;
			timeStr += mon < 10 ? '0' + mon : mon;
			timeStr += day < 10 ? '0' + day : day;
			timeStr += hour < 10 ? '0' + hour : hour;
			timeStr += min < 10 ? '0' + min : min;
			timeStr += sec < 10 ? '0' + sec : sec;
			return timeStr;
		}

		for (let i = 0; i < timelineList.data.length; i++) {
			const t = timelineList.data[i];
			const tl = t.timelines.sort((a, b) => a.start - b.start);;
			for (let j = 0; j < tl.length; j++) {
				const entry = tl[j];
				const start = new Date(entry.start);
				const stop = new Date(entry.stop);
				const programme = {
					"_attributes": {
						"channel": t.channelId + (regionalize ? '-' + region : ''),
						"start": `${getTimeStr(start)} +0000`,
						"stop": `${getTimeStr(stop)} +0000`
					},
					"title": {
						"_text": entry.title
					},
					"desc": {
						"_text": entry.episode.description
					},
					"icon": {
						"_attributes": {
							"src": utils.escapeHTML(entry.episode.series.tile.path)
						}
					}
				}
				obj.tv.programme.push(programme);
			}
		}

		return converter.json2xml(JSON.stringify(obj), {compact: true, ignoreComment: true, spaces: 4});
	}

	exports = module.exports = {
		boot,
		channels,
		categories,
		timelines,
		generateM3U8,
		generateXMLTV
	}
})();
