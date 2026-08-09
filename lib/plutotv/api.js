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
		let m3u8 = '#EXTM3U\n\n#EXTINF:-1 tvg-id="antennatv.us" tvg-name="ANTENNA TV US" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Antenna_TV_logo.png" group-title="Live TV",Antenna TV\n\http://40.160.24.52/ANTENNA_TV/index.m3u8\n\n#EXTINF:-1 tvg-id="awe.us" tvg-name="AWE" tvg-logo="http://primestreamstv.com/logos/awelogo.png" group-title="Live TV",AWE\n\https://awe-lg.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="awe.us" tvg-name="AWE" tvg-logo="http://primestreamstv.com/logos/awelogo.png" group-title="Live TV",AWE\n\https://a-cdn.klowdtv.com/live1/awe_720p/playlist.m3u8\n\n#EXTINF:-1 tvg-id="AWE+" tvg-name="AWE Encore" tvg-logo="https://uspto.report/TM/88923573/mark.png" group-title="Live TV",AWE Encore\n\https://aweencore-tcl.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="bravo.us" tvg-name="Bravo" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Bravo_2017.png" group-title="Live TV",Bravo\n\http://4.30.180.36:8420/bravo/index.m3u8?token=test\n\n#EXTINF:-1 tvg-id="decadeswvah.us" tvg-name="Catchy Comedy" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/decades-1.png" group-title="Live TV",Catchy Comedy\n\http://bgdc.live:25461/live/deborahbowden/99126515/22435.m3u8\n\n#EXTINF:-1 tvg-id="cozitv.us" tvg-name="Cozi" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/cozi5.png" group-title="Live TV",Cozi\n\http://173.225.32.123/Cozi-2358/index.m3u8\n\n#EXTINF:-1 tvg-id="destinationamerica.us" tvg-name="Destination America" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Destination_America_2015.png" group-title="Live TV",Destination America\n\http://tvmate.icu:8080/live/drudolf@bellsouth.net/drudolf@2024/14222.m3u8\n\n#EXTINF:-1 tvg-id="fxx.us" tvg-name="FXX" tvg-logo="http://primestreamstv.com/logos/FXX%20HD.png" group-title="Live TV",FXX\n\http://23.237.104.106:8080/USA_FXX/index.m3u8\n\n#EXTINF:-1 tvg-id="lafftv.us" tvg-name="Laff More" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/laff.jpg" group-title="Live TV",Laff More\n\https://53f72aa7.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UGxleF9MYWZmTW9yZV9ITFM/playlist.m3u8\n\n#EXTINF:-1 tvg-id="metv.us" tvg-name="MeTV" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/metv.png" group-title="Live TV",MeTV\n\http://40.160.24.53/METV/index.m3u8\n\n#EXTINF:-1 tvg-id="metvplus.us" tvg-name="METV+" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/7/7e/MeTV%2B_%282021%29.png" group-title="Live TV",METV+\n\http://bgdc.live:25461/live/tommyk1933/5855009134/206833.m3u8\n\n#EXTINF:-1 tvg-id="metv.toons.us" tvg-name="MeTV Toons" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/2/2b/MeTV_Toons.png" group-title="Live TV",MeTV Toons\n\http://bgdc.live:25461/live/tommyk1933/5855009134/95324.m3u8\n\n#EXTINF:-1 tvg-id="More TV Sitcoms" tvg-name="More TV Sitcoms" tvg-logo="https://public-assets-pressexpress.s3.amazonaws.com/assets/pages/images/2024/08/01/MoreTvSitcomsPLUTO_Channel_1080x1080_HeroSquare-1824yaim.png" group-title="Live TV",More TV Sitcoms\n\https://jmp2.uk/plu-6132619f9ddaa50007e7dd86.m3u8\n\n#EXTINF:-1 tvg-id="shout.us" tvg-name="Shout! TV" tvg-logo="https://play-lh.googleusercontent.com/kLxu4FV_m4wCYbiLZTnA3CSyQImcsUrD2LST5aMqnIninqatLCbm47v9WbFNjJPwt1jFse0FJVD3zyggDKZLaV0" group-title="Live TV",Shout!TV\n\https://shoutfactory-localnow.amagi.tv/playlist.m3u8\n\n#EXTINF:-1 tvg-id="smithsonianchannel.us" tvg-name="Smithsonian Channel" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/Smithsonian.png" group-title="Live TV",Smithsonian Channel\n\http://40.160.24.55/SMITHSONIAN/index.m3u8\n\n#EXTINF:-1 tvg-id="tbs.us" tvg-name="TBS" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TBS_2015.png" group-title="Live TV",TBS\n\https://turnerlive.warnermediacdn.com/hls/live/2023172/tbseast/slate/VIDEO_0_3564000.m3u8\n\n#EXTINF:-1 tvg-id="tnt.us" tvg-name="TNT" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TNT_logo_1999.png" group-title="Live TV",TNT\n\https://turnerlive.warnermediacdn.com/hls/live/2023168/tnteast/slate/VIDEO_0_3564000.m3u8\n\n#EXTINF:-1 tvg-id="tvlandeast.us" tvg-name="TV LAND" tvg-logo="https://cantseeus.com/wp-content/uploads/2023/10/TV_Land_2015.png" group-title="Live TV",TV LAND\n\http://40.160.24.55/TV_LAND/index.m3u8\n\n#EXTINF:-1 tvg-id="TV Land Sitcoms" tvg-name="TV Land Sitcoms" tvg-logo="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9-Bq3CcDfrID7ccImoFTGl7xEp5ZMKS-lNErqafU_wg&s" group-title="Live TV",TV Land Sitcoms\n\https://jmp2.uk/plu-5c2d64ffbdf11b71587184b8.m3u8\n\n';
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
