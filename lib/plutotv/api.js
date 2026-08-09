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
		let m3u8 = '#EXTM3U\n\n#EXTINF:-1 tvg-id="antennatv.us" tvg-name="ANTENNA TV US" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Antenna_TV_logo.png" group-title="Live TV",Antenna TV\n\http://40.160.24.52/ANTENNA_TV/index.m3u8\n\n#EXTINF:-1 tvg-id="awe.us" tvg-name="AWE" tvg-logo="http://primestreamstv.com/logos/awelogo.png" group-title="Live TV",AWE\n\https://awe-lg.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="awe.us" tvg-name="AWE" tvg-logo="http://primestreamstv.com/logos/awelogo.png" group-title="Live TV",AWE\n\https://a-cdn.klowdtv.com/live1/awe_720p/playlist.m3u8\n\n#EXTINF:-1 tvg-id="AWE+" tvg-name="AWE Encore" tvg-logo="https://uspto.report/TM/88923573/mark.png" group-title="Live TV",AWE Encore\n\https://aweencore-tcl.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="bravo.us" tvg-name="Bravo" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Bravo_2017.png" group-title="Live TV",Bravo\n\http://4.30.180.36:8420/bravo/index.m3u8?token=test\n\n#EXTINF:-1 tvg-id="decadeswvah.us" tvg-name="Catchy Comedy" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/decades-1.png" group-title="Live TV",Catchy Comedy\n\http://bgdc.live:25461/live/deborahbowden/99126515/22435.m3u8\n\n#EXTINF:-1 tvg-id="cozitv.us" tvg-name="Cozi" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/cozi5.png" group-title="Live TV",Cozi\n\http://173.225.32.123/Cozi-2358/index.m3u8\n\n#EXTINF:-1 tvg-id="destinationamerica.us" tvg-name="Destination America" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Destination_America_2015.png" group-title="Live TV",Destination America\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/14222.m3u8\n\n#EXTINF:-1 tvg-id="fxx.us" tvg-name="FXX" tvg-logo="http://primestreamstv.com/logos/FXX%20HD.png" group-title="Live TV",FXX\n\http://23.237.104.106:8080/USA_FXX/index.m3u8\n\n#EXTINF:-1 tvg-id="lafftv.us" tvg-name="Laff More" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/laff.jpg" group-title="Live TV",Laff More\n\https://53f72aa7.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UGxleF9MYWZmTW9yZV9ITFM/playlist.m3u8\n\n#EXTINF:-1 tvg-id="metv.us" tvg-name="MeTV" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/metv.png" group-title="Live TV",MeTV\n\http://40.160.24.53/METV/index.m3u8\n\n#EXTINF:-1 tvg-id="metvplus.us" tvg-name="METV+" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/7/7e/MeTV%2B_%282021%29.png" group-title="Live TV",METV+\n\http://bgdc.live:25461/live/tommyk1933/5855009134/206833.m3u8\n\n#EXTINF:-1 tvg-id="metv.toons.us" tvg-name="MeTV Toons" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/2/2b/MeTV_Toons.png" group-title="Live TV",MeTV Toons\n\http://bgdc.live:25461/live/tommyk1933/5855009134/95324.m3u8\n\n#EXTINF:-1 tvg-id="More TV Sitcoms" tvg-name="More TV Sitcoms" tvg-logo="https://public-assets-pressexpress.s3.amazonaws.com/assets/pages/images/2024/08/01/MoreTvSitcomsPLUTO_Channel_1080x1080_HeroSquare-1824yaim.png" group-title="Live TV",More TV Sitcoms\n\https://jmp2.uk/plu-6132619f9ddaa50007e7dd86.m3u8\n\n#EXTINF:-1 tvg-id="shout.us" tvg-name="Shout! TV" tvg-logo="https://play-lh.googleusercontent.com/kLxu4FV_m4wCYbiLZTnA3CSyQImcsUrD2LST5aMqnIninqatLCbm47v9WbFNjJPwt1jFse0FJVD3zyggDKZLaV0" group-title="Live TV",Shout!TV\n\https://shoutfactory-localnow.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="smithsonianchannel.us" tvg-name="Smithsonian Channel" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Smithsonian.png" group-title="Live TV",Smithsonian Channel\n\http://40.160.24.55/SMITHSONIAN/index.m3u8\n\n#EXTINF:-1 tvg-id="tbs.us" tvg-name="TBS" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TBS_2015.png" group-title="Live TV",TBS\n\https://turnerlive.warnermediacdn.com/hls/live/2023172/tbseast/slate/VIDEO_0_3564000.m3u8\n\n#EXTINF:-1 tvg-id="tnt.us" tvg-name="TNT" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TNT_logo_1999.png" group-title="Live TV",TNT\n\https://turnerlive.warnermediacdn.com/hls/live/2023168/tnteast/slate/VIDEO_0_3564000.m3u8\n\n#EXTINF:-1 tvg-id="tvlandeast.us" tvg-name="TV LAND" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TV_Land_2015.png" group-title="Live TV",TV LAND\n\http://40.160.24.55/TV_LAND/index.m3u8\n\n#EXTINF:-1 tvg-id="TV Land Sitcoms" tvg-name="TV Land Sitcoms" tvg-logo="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9-Bq3CcDfrID7ccImoFTGl7xEp5ZMKS-lNErqafU_wg&s" group-title="Live TV",TV Land Sitcoms\n\https://jmp2.uk/plu-5c2d64ffbdf11b71587184b8.m3u8\n\n#EXTINF:-1 tvg-id="usanetwork.us" tvg-name="USA Network" tvg-logo="http://primestreamstv.com/logos/USA%20Network.png" group-title="Live TV",USA Network\n\http://40.160.24.55/USA_NETWORK/index.m3u8\n\n#EXTINF:-1 tvg-id="foxnews.us" tvg-name="Fox News Channel" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/foxnews.png" group-title="Locals",Fox News\n\http://tkosportz.live:25461/live/mariaores/26845656/31182.m3u8\n\n#EXTINF:-1 tvg-id="weatherchannel.us" tvg-name="The Weather Channel" tvg-logo="https://www.cleanpng.com/png-the-weather-channel-latin-america-weather-forecast-lgw89f/" group-title="Locals",The Weather Channel\n\http://tkosportz.live:25461/live/mariaores/26845656/10449.m3u8\n\n#EXTINF:-1 tvg-id="abcwcvb.us" tvg-name="ABC Boston (WCVB)" tvg-logo="https://static.wikia.nocookie.net/logopedia/images/a/a8/WCVB_2008.png/revision/latest?cb=20211003190252" group-title="Locals",ABC Boston (WCVB)\n\http://myxpanel.pro:80/live/edc/edc/1251.m3u8\n\n#EXTINF:-1 tvg-id="cbs4wbz.us" tvg-name="CBS Boston (WBZ)" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/7/70/WBZ-TV_logo.png" group-title="Locals",CBS Boston (WBZ)\n\http://myxpanel.pro:80/live/edc/edc/1414.m3u8\n\n#EXTINF:-1 tvg-id="cbs6wtvr.us" tvg-name="CBS 6 Richmond (WTVR)" tvg-logo="https://banner2.kisspng.com/20180720/fxa/kisspng-cbs-6-wtvr-tv-logo-brand-prince-william-public-library-system-5b52901586b827.5369758315321374935518.jpg" group-title="Locals",CBS 6 Richmond (WTVR)\n\http://myxpanel.pro:80/live/edc/edc/295600.m3u8\n\n#EXTINF:-1 tvg-id="fox25wfxt.us" tvg-name="FOX Boston (WFXT)" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/2/25/Wfxt_2011.png" group-title="Locals",FOX Boston (WFXT)\n\http://myxpanel.pro:80/live/edc/edc/1639.m3u8\n\n#EXTINF:-1 tvg-id="nbc12wwbt.us" tvg-name="NBC 12 (WWBT) Richmond" https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGTYp5wpGIde329ZWzPs_oENJBDrnhA7oJYd-9qD13Yw&s=10" group-title="Locals",NBC 12 (WWBT) Richmond\n\http://myxpanel.pro:80/live/edc/edc/1730.m3u8\n\n#EXTINF:-1 tvg-id="abcwabc.us" tvg-name="ABC EAST" tvg-logo="http://primestreamstv.com/logos/ABC.png" group-title="Locals",ABC EAST\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/22990.m3u8\n\n#EXTINF:-1 tvg-id="cbs.us" tvg-name="CBS EAST" tvg-logo="https://logos-world.net/wp-content/uploads/2020/08/CBS-Logo.png" group-title="Locals",CBS EAST\n\http://4.30.180.36:8420/cbs/index.m3u8?token=test\n\n#EXTINF:-1 tvg-id="cw.us" tvg-name="CW EAST" tvg-logo="https://docdog.top/logo/countries/us/cw.png" group-title="Locals",CW EAST\n\http://ultratv.one:2095/live/hCPtsREFtA/Xj25tg0ZXi/2114289.m3u8\n\n#EXTINF:-1 tvg-id="fox.us" tvg-name="FOX EAST" tvg-logo="https://docdog.top/logo/countries/us/fox.png" group-title="Locals",FOX EAST\n\http://stream.cammonitorplus.net/1752/index.m3u8\n\n#EXTINF:-1 tvg-id="nbcwnbc.us" tvg-name="NBC EAST" tvg-logo="http://primestreamstv.com/logos/NBC.png" group-title="Locals",NBC EAST\n\http://stream.cammonitorplus.net/1785/index.m3u8\n\n#EXTINF:-1 tvg-id="cookingchannel.us" tvg-name="Cooking Channel" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Cooking_Channel.png" group-title="Home + Food",Cooking Channel\n\http://23.237.104.106:8080/USA_COOKING/index.m3u8?takodachi\n\n#EXTINF:-1 tvg-id="cookingchannel.us" tvg-name="CookingChannel" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Cooking_Channel.png" group-title="Home + Food",CookingChannel\n\http://31.43.191.125:8080/live/VIP019301734188047280/7bce5254f13d/154957.m3u8\n\n#EXTINF:-1 tvg-id="cookingchannel.us" tvg-name="Cooking Channel HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Cooking_Channel.png" group-title="Home + Food",Cooking Channel HD \n\https://gpuserver3.tier1streams.com/COOKING_CHANNEL/index.m3u8\n\n#EXTINF:-1 tvg-id="foodnetwork.us" tvg-name="Food Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/FoodNetLogo.png" group-title="Home + Food",Food Network\n\https://gpuserver3.tier1streams.com/FOOD_NETWORK/index.m3u8\n\n#EXTINF:-1 tvg-id="foodnetwork.us" tvg-name="Food Network HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/FoodNetLogo.png" group-title="Home + Food",Food Network HD\n\http://23.237.104.106:8080/USA_FOOD_NETWORK/index.m3u8\n\n#EXTINF:-1 tvg-id="hgtv.us" tvg-name="HGTV" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Home_Garden_Television.png" group-title="Home + Food",HGTV\n\http://40.160.24.53/HGTV/index.m3u8\n\n#EXTINF:-1 tvg-id="hgtv.us" tvg-name="HGTV" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Home_Garden_Television.png" group-title="Home + Food",HGTV\n\https://i.mjh.nz/.r/sky-hgtv.m3u8\n\n#EXTINF:-1 tvg-id="homemadenation.us" tvg-name="Home Made Nation" tvg-logo="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfrF0OHOneIhv6P_Zb-e-RYgfNhztn9FpAVB3zFG_M6A&s=10" group-title="Home + Food",Home Made Nation\n\https://d1kgo9l74vimu0.cloudfront.net/v1/aenetworks_ae_1/samsungheadend_us/latest/main/hls/playlist.m3u8\n\n#EXTINF:-1 tvg-id="Homeful.us" tvg-name="Homeful" tvg-logo="https://homefultv.com/wp-content/uploads/2023/03/Homeful_Logo_MintWhite-1280x324.png" group-title="Home + Food",Homeful\n\https://amg00090-blueantcanada-amg00090c4-samsung-au-819.playouts.now.amagi.tv/playlist/amg00090-blueantfast-homefulworldwide-samsungau/playlist.m3u8\n\n#EXTINF:-1 tvg-id="tvg-name="magnolianetwork.us.us" tvg-name="DIY Network" tvg-logo="https://bloximages.chicago2.vip.townnews.com/wacotrib.com/content/tncms/assets/v3/editorial/9/b0/9b05e606-3a55-11eb-9715-ab80" group-title="Home + Food",DIY Network\n\https://gpuserver3.tier1streams.com/DIY/index.m3u8\n\n#EXTINF:-1 tvg-id="magnolianetwork.us" tvg-name="Magnolia Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/DIY_Network.png" group-title="Home + Food",Magnolia Network\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/10503.m3u8\n\n#EXTINF:-1 tvg-id="NBCLX.us@SD" tvg-name="NBC LX Home" tvg-logo="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSc8AXuZoH-p8WZD8lgHNZcq0VeyremC_ZqdFmJKyfNEQ&s" group-title="Home + Food",NBC LX Home\n\https://nbculocallive.akamaized.net/hls/live/2037096/lx/use1.m3u8\n\n#EXTINF:-1 tvg-id="Tastemade.Home.us" tvg-name="Tastemade Home" tvg-logo="https://m.media-amazon.com/images/G/01/digital/video/Linear_Clean_Slate/Carbon_Integration_Station_Image_Update/16x9_TMHomeLogo_FreeVee.png" group-title="Home + Food",Tastemade Home\n\https://d3ca4qxsdzlrju.cloudfront.net/Tastemade_Home.m3u8\n\n#EXTINF:-1 tvg-id="WBTV" tvg-name="24/7 - WB Welcome Home" tvg-logo="https://www.imdb.com/title/tt8992540/mediaviewer/rm306803200/?ref_=tt_ov_i" group-title="Home + Food",24/7 - WB Welcome Home\n\https://live-manifest.production-public.tubi.io/live/edb986fe-9600-4f83-8b6d-8593986f2f3a/playlist.m3u8\n\n#EXTINF:-1 tvg-id="643f03b9d8436e0008edf021" tvg-name="Family Feud Classic" tvg-logo="https://images.pluto.tv/channels/643f03b9d8436e0008edf021/colorLogoPNG.png" group-title="Gameshows",Family Feud Classic\n\https://amg00145-amg00145c3-xumo-us-3802.playouts.now.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="ThePriceIsRightTheBarkerEra.us@SD" tvg-name="The Price is Right: The Barker Era" tvg-logo="https://images.pluto.tv/channels/5f7791b8372da90007fd45e6/colorLogoPNG.png" group-title="Gameshows",The Price is Right: The Barker Era\n\https://amg00145-buzzr-bigballs-tpir-8min-rokuus-otcre.amagi.tv/playlist/amg00145-buzzr-bigballs-tpir-8min-rokuus/playlist.m3u8\n\n#EXTINF:-1 tvg-id="Supermarket Sweep" tvg-name="Supermarket Sweep" tvg-logo="https://images.pluto.tv/channels/649ddbfb6f29ec000874ca9e/colorLogoPNG.png" group-title="Gameshows",Supermarket Sweep\n\https://amg00145-letsplayinc-supermarketswep-xumo-59bvy.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="gameshownetwork.us@East" tvg-name="Gameshow Network" tvg-logo="http://primestreamstv.com/logos/gsn" group-title="Gameshows",GameShow Network\n\http://40.160.24.52/GSN/index.m3u8\n\n#EXTINF:-1 tvg-id="amc.us" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/AMC_logo_2019.svg/960px-AMC_logo_2019.svg.png" group-title="Movies",AMC\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/18925.m3u8\n\n#EXTINF:-1 tvg-id="freeform.us" tvg-name="Freeform" tvg-logo="http://primestreamstv.com/logos/Freeform%20TV.png" group-title="Movies",Freeform\n\http://tkosportz.live:25461/live/deborahbowden/99126515/10398.m3u8\n\n#EXTINF:-1 tvg-id="freeform.us" tvg-name="Freeform" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Freeform_2018.png" group-title="Movies",Freeform\n\http://40.160.24.52/FREEFORM/index.m3u8\n\n#EXTINF:-1 tvg-id="fx.us" tvg-name="FX" tvg-logo="http://primestreamstv.com/logos/FX.png" group-title="Movies",FX\n\http://23.237.104.106:8080/USA_FX/index.m3u8\n\n#EXTINF:-1 tvg-id="fx.us" tvg-name="FX" tvg-logo="http://primestreamstv.com/logos/FX.png" group-title="Movies",FX\n\http://40.160.24.52/FX/index.m3u8\n\n#EXTINF:-1 tvg-id="fxm.us" tvg-name="FX Movies HD" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/fxm1111.png" group-title="Movies",FX Movies HD\n\http://s.rocketdns.info:8080/live/monstercable/Dq6jjknxCr/3736.m3u8\n\n#EXTINF:-1 tvg-id="fxmoviechannel.us" tvg-name="FX Movies" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/fxm1111.png" group-title="Movies",FX Movies\n\http://40.160.24.52/FXM/index.m3u8\n\n#EXTINF:-1 tvg-id="gacfamily.us" tvg-name="Great American Family" tvg-logo="https://cdn.blog.bendbroadband.com/wp-content/uploads/sites/3/2013/10/GreatAmericanCountryREV.jpg" group-title="Movies",Great American Family\n\http://40.160.24.58/GAC_FAMILY/index.m3u8\n\n#EXTINF:-1 tvg-id="hallmark.us" tvg-name="Hallmark Channel" tvg-logo="http://primestreamstv.com/logos/Hallmark.png" group-title="Movies",Hallmark Channel\n\http://bgdc.live:25461/live/tommyk1933/5855009134/10407.m3u8\n\n#EXTINF:-1 tvg-id="hallmark.us" tvg-name="Hallmark Channel" tvg-logo="http://primestreamstv.com/logos/Hallmark.png" group-title="Movies",Hallmark Channel\n\http://40.160.24.53/HALLMARK/index.m3u8\n\n#EXTINF:-1 tvg-id="hallmarkfamily.us" tvg-name="Hallmark Family" tvg-logo="https://cdn.movieguide.org/wp-content/uploads/2024/02/Screen-Shot-2024-02-21-at-1.38.54-PM.jpeg" group-title="Movies",Hallmark Family\n\http://40.160.24.53/HALLMARK_DRAMA/index.m3u8\n\n#EXTINF:-1 tvg-id="hallmarkmoviesmysteries.us" tvg-name="Hallmark Movies & More" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Hallmark_Movie-more.png" group-title="Movies",Hallmark Movies & More\n\https://dbrb49pjoymg4.cloudfront.net/v1/master/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod_default_xumo-ams-aws/master.m3u8?ads.xumo_channelId=99991709\n\n#EXTINF:-1 tvg-id="Hi-YAH.us" tvg-logo="https://i.imgur.com/sOYAnTB.png" group-title="Movies",Hi-YAH!\n\https://linear-59.frequency.stream/dist/plex/59/hls/master/playlist.m3u8\n\n#EXTINF:-1 tvg-id="Miramax Movies" tvg-name="Miramax Movies" tvg-logo="https://images.plex.tv/photo?size=large-1920&scale=1&url=https%3A%2F%2Fprovider-static.plex.tv%2Fepg%2Fcms%2Fproduction%2F39d7cc81-90e2-4ffa-a5f3-8cdc69c86db6%2FMIRAMAX_LOGO_VARIATION_2_-_Gabe_Evans.png" group-title="Movies",Miramax Movies\n\https://pb-w5d3w3kisxahy.akamaized.net/playlist.m3u8\n\n#EXTINF:-1 tvg-id="MovieSphere.us" tvg-name="MovieSphere" tvg-logo="https://images-cdn2.welcomesoftware.com/assets/Moviesphere-hero.png/Zz0zZmZmOWIxMmExNGUxMWVmYTUwY2FlYmM1NTY3YTAzZA==?width=880&height=494" group-title="Movies",MovieSphere\n\https://aegis-cloudfront-1.tubi.video/8b127a5b-3054-4f39-93a2-1c4aab9ef5ff/playlist.m3u8\n\n#EXTINF:-1 tvg-id="paramountnetwork.us" tvg-name="Paramount Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Paramount_Network.png" group-title="Movies",Paramount Network\n\http://40.160.24.55/PARAMOUNT_CHANNEL/index.m3u8\n\n#EXTINF:-1 tvg-id="PBSAntiquesRoadshow" tvg-name="PBSAntiquesRoadshow" tvg-logo="https://www.pbs.org/wgbh/roadshow/media/original_images/ANRO_Detours-SigImage_CR12543_1920x1080_F1.png" group-title="24/7 Shows",24/7 - Antiques Roadshow PBS\n\https://amg00953-pbsusa-antiroadshow-xumo-x6ud5.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="AntiquesRoadshowUK" tvg-name="Antiques Roadshow UK" tvg-logo="https://upload.wikimedia.org/wikipedia/en/thumb/a/a0/Antiques_Roadshow_%28title_card%29.jpg/250px-Antiques_Roadshow_%28title_card%29.jpg" group-title="24/7 Shows",24/7 - Antiques Roadshow UK\n\https://bbc-antiquesroadshowuk-1-us.xumo.wurl.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="66ba495ffe11e5000881f049" tvg-name="Cheers + Frasier"  tvg-logo="https://images.pluto.tv/channels/66ba495ffe11e5000881f049/colorLogoPNG.png" group-title="24/7 Shows",24/7 - Cheers + Frasier\n\https://jmp2.uk/plu-66ba495ffe11e5000881f049.m3u8\n\n#EXTINF:-1 tvg-id="Chips" tvg-name="https://chips-tv.com/wiki/images/9/97/CHiPsLogo.jpg" group-title="24/7 Shows",24/7 - CHiPs\n\http://myxpanel.pro/live/bree/bree/89403.m3u8\n\n#EXTINF:-1 tvg-id="keepingapearances.uk" tvg-name="24/7 - Keeping Up Appearances" tvg-logo="https://m.media-amazon.com/images/S/pv-target-images/6f10e62a5b71288aa58aa74f0e3800ae81600744fa1dfdf86ddf43dc734442e7.png" group-title="24/7 Shows",24/7 - Keeping Up Appearances\n\http://myxpanel.pro:80/live/edc/edc/102143.m3u8\n\n#EXTINF:-1 tvg-id="thedukesofhazzard.us" tvg-name="https://resizing.flixster.com/D3XgqvdjrshIX0usgSeRtOiOa3k=/375x210/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p184010_i_h10_ab.jpg" group-title="24/7 Shows",24/7 - The Dukes of Hazzard\n\http://myxpanel.pro/live/bree/bree/89323.m3u8\n\n#EXTINF:-1 tvg-id="TheLoveBoat.us@SD" tvg-logo="https://images.pluto.tv/channels/62e91563ce7ce300076f917e/colorLogoPNG.png" group-title="24/7 Shows",24/7 - The Love Boat\n\https://jmp2.uk/plu-654a4fe9056b9700088804a0.m3u8\n\n#EXTINF:-1 tvg-id="Munsters" tvg-name="24/7 - The Munsters" tvg-logo="https://image.tmdb.org/t/p/original/zC1aY5o2c0ZCyqx43uboJMqbXhS.png" group-title="24/7 Shows",24/7 - The Munsters\n\http://myxpanel.pro:80/live/edc/edc/89314.m3u8\n\n#EXTINF:-1 tvg-id="3 Stooges" tvg-name="24/7 - The Three Stooges+" tvg-logo="http://teemorris.com/wp-content/uploads/2010/12/Stoogelogo.png" group-title="24/7 Shows",24/7 - The Three Stooges+\n\https://amg02451-c3-amg02451c1-vizio-us-3670.playouts.now.amagi.tv/playlist/amg02451-c3entertainmentinc-thethreestooges-vizious/playlist.m3u8\n\n#EXTINF:-1 tvg-id="5ef3977e5d773400077de284" tvg-name="24/7 - Threes Company" tvg-logo="https://images.pluto.tv/channels/5ef3977e5d773400077de284/colorLogoPNG_1731835807101.png" group-title="24/7 Shows", 24/7 - Threes Company\n\http://themyst.icu:826/live/SourPatchKid/nlnE4DVQUs/99933.m3u8\n\n#EXTINF:-1 tvg-id="accnetwork.us" tvg-name="ACC Network" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/ACC_Network_ESPN.png" group-title="Sports",ACC Network\n\http://40.160.24.52/ACC_NETWORK/index.m3u8\n\n#EXTINF:-1 tvg-id="" tvg-name="ATLANTAfBRAVES" tvg-logo="https://img.mlbstatic.com/mlb-images/image/upload/t_4x1/t_w1024/v1775155466/mlb/iefkclr3ijprh82tt4t9.png" group-title="Sports",ATLANTA BRAVES\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/324234.m3u8\n\n#EXTINF:-1 tvg-id="espn.us" tvg-name="ESPN" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/espn.png" group-title="Sports",ESPN\n\http://bgdc.live:25461/live/tommyk1933/5855009134/38226.m3u8\n\n#EXTINF:-1 tvg-id="espn.us" tvg-name="ESPN 1" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/espn.png" group-title="Sports",ESPN1\n\http://40.160.24.52/ESPN_HD/index.m3u8\n\n#EXTINF:-1 tvg-id="espn2.us" tvg-name="ESPN 2" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/espn-2.png" group-title="Sports",ESPN 2\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/2210.m3u8\n\n#EXTINF:-1 tvg-id="espnnews.us" tvg-name="ESPN News" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/espnnews.png" group-title="Sports",ESPN News\n\http://40.160.24.52/ESPN_NEWS/index.m3u8\n\n';
		
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
