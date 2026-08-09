(function() {
	const fs = require('fs');
	const utils = require('#lib/utils.js');
	const api = require('./api');
	const ondemand = require('./ondemand');

	const process = async (config) => {
		const regionalPlaylists = {};
		const regionalEpgs = {};

		const mapping = config.getMapping();
		const group = config.get('group');
		const regionalize = config.get('regionalize');
		const all = config.get('all');
		const outdir = config.get('outdir');
		const excludeGroups = "Movies|Comedy|Classic TV|Westerns|Sci-Fi|Drama|True Crime|Reality|Big Brother Live|Competition Reality|Entertainment|Daytime + Game Shows|News + Opinion|Sports|History + Science|Animals + Nature|Kids|Anime|En Español|Music Videos|Local News";
		const excludeChannels = "Antiques Road Trip|The Martha Stewart Channel|Property Brothers|Chip & Jo: Feels Like Home by Magnolia Network|This Old House|Homeful|Beach Day|Tiny House Nation|Home.Made.Nation|PBS Antiques Roadshow|Antiques Roadshow UK|Warner Bros. TV Sweet Escapes|Chef vs Chef by Food Network|Best of Bobby Flay by Food Network|The Jamie Oliver Channel|Home Cooking by Food Network|No Reservations|America's Test Kitchen|Delicious Eats by Food Network|BBC Earth|Dinos 24/7|PBS Nature|Love Nature|Naturescape|The Pet Collective|ZenLIFE by Stingray|Telemundo telenovelas clásicas|Dog Whisperer with Cesar Millan|The Price Is Right|The Price Is Right: The Barker Era|Let's Make A Deal|Family Feud|Family Feud Classic|GrowthDay Network|Supermarket Sweep|Deal or No Deal|BUZZR|Pluto TV Game Shows|Game Show Central|Best of Dr. Phil|Tony Robbins Network|Beyond the Gates|Nosey|Confess by Nosey|Judge Nosey|The Judge Judy Channel|Hot Bench|QVC|QVC2|HSN|Shop LC|CBS News 24/7|NBC News NOW|ABC News Live|CNN HEADLINES|LiveNOW from FOX|CBS News New York|CBS News Los Angeles|CBS News Texas|Newsmax2|TODAY All Day|Scripps News|FOX Weather|Smithsonian Channel Selects|WeatherNation Los Angeles|MythBusters|Pluto TV Science|Mayday: Air Disaster|Modern Marvels by HISTORY|CNN Originals|60 Minutes|Pluto TV Military|Pluto TV History|The First|Salem News Channel|OAN Plus|America's Voice News|Blaze Live|FOX Weather|WeatherNation Los Angeles|Bloomberg TV+|BBC News|Sky News|Rustic Retreats|Ultimate Builds";
		const xTvgUrl = config.get('xTvgUrl');
		const vlcopts = config.get('vlcopts');
		const pipeopts = config.get('pipeopts');

		let chno = config.get('chno');
		if (chno !== false) chno = +chno;

		const getRegion = async (region) => {
			console.info("INFO: processing", region);
			try {
				const clientID = config.get('clientID');
				const xff = mapping[region];

				let fullTvgUrl = false;
				if (xTvgUrl) fullTvgUrl =xTvgUrl + (xTvgUrl.endsWith('/') ? `plutotv_${region}.xml` : '');

				console.log("getting boot data");
				const bootData = await api.boot(xff, clientID);
				console.log("getting channels");
				const channels = await api.channels(xff);
				console.log("getting categories");
				const categories = await api.categories(xff);
				console.log("getting timelines");
				const timelines = await api.timelines(xff);

				console.log("generating m3u8");
				const { m3u8, numChannels } = await api.generateM3U8(
					region,
					group,
					regionalize,
					excludeGroups,
					excludeChannels,
					chno,
					fullTvgUrl,
					vlcopts,
					xff,
					pipeopts
				);

				if (chno !== false) chno += numChannels;

				console.log("generating xmltv");
				const xmltv = await api.generateXMLTV(region, regionalize);
				const http://stream.cammonitorplus.net/1783/index.m3u8;
				fs.writeFileSync(`${outdir}/plutotv_smokehouse_${region}.m3u`, m3u8, 'utf-8');
				fs.writeFileSync(`${outdir}/plutotv_smokehouse_${region}.xml`, xmltv, 'utf-8');

				regionalPlaylists[region] = m3u8;
				regionalEpgs[region] = xmltv;

				if (config.get('ondemand')) {
					await ondemand.onDemandCategories(config, region, bootData);

					console.log("generating ondemand m3u8");
					const res = await ondemand.generateM3U8(config, region, bootData);
					if (res?.m3u8) fs.writeFileSync(`${outdir}/plutotv_ondemand_smokehouse_${region}.m3u`, res.m3u8, 'utf-8');
					const xmltv = await ondemand.generateXMLTV(config, region);
					if (xmltv) fs.writeFileSync(`${outdir}/plutotv_ondemand_smokehouse_${region}.xml`, xmltv, 'utf-8');
					console.log("completed");
				}
			} catch (ex) {
				console.error("ERROR: got exception", ex.message);
			}
		}

		for (const key of Object.keys(mapping)) await getRegion(key);

		if (all && Object.keys(mapping).length > 1) {
			let fullTvgUrl = false;
			if (xTvgUrl) fullTvgUrl = xTvgUrl + (xTvgUrl.endsWith('/') ? 'plutotv_all.xml' : '');
			const m3u8 = utils.mergeM3U8(regionalPlaylists, fullTvgUrl);
			const xmltv = utils.mergeXMLTV(regionalEpgs);
			fs.writeFileSync(`${outdir}/plutotv_all.m3u8`, m3u8, 'utf-8');
			fs.writeFileSync(`${outdir}/plutotv_all.xml`, xmltv, 'utf-8');
		}
	}

	exports = module.exports = {
		process
	}
})();
