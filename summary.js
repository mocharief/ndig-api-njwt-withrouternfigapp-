// analyses.js

module.exports = function(AnalysedInfo){
	var async = require('async');
	var dateFormat = require('dateformat');
	var summArr = new Array();

	var kategori = require("./data/documentCategories.json");

	getProvinceSummary = function (fn){
		summArr.length = 0;
		// Ambil list kota
		AnalysedInfo.distinct("eventDaerahTk1", function(err, provinces) {
			if (err)
				res.send(err);

			getEachProvSummary(provinces, fn);
		});
	}

	getEachProvSummary = function(provinces, fn)
	{
		async.each(provinces, function(province , eachcallback)
		{
			var newSumm = new Object();

			async.series([
				function(callback) {
					// Ambil jumlah low threats
					AnalysedInfo.find({$and:[{"eventDaerahTk1" : province},{"threatWarning": "low"}]}, function(err, lowthreats) {
						if (err)
							res.send(err);

						// callback(null, lowthreats.length);

						// ambil summari kategori
						AnalysedInfo.distinct("categoryMain", {$and: [{"eventDaerahTk1" : province}, {"threatWarning":"low"}]}, function(err, catSumm) {
							if (err)
								res.send(err);

							callback(null, {"nLow": lowthreats.length, "catSumm": catSumm});
						});
					});
				},
				function(callback) {
					// Ambil jumlah medium threats
					AnalysedInfo.find({$and:[{"eventDaerahTk1" : province},{"threatWarning": "medium"}]}, function(err, medthreats) {
						if (err)
							res.send(err);

						// callback(null, medthreats.length);

						// ambil summari kategori
						AnalysedInfo.distinct("categoryMain", {$and: [{"eventDaerahTk1" : province}, {"threatWarning":"medium"}]}, function(err, catSumm) {
							if (err)
								res.send(err);

							callback(null, {"nMed": medthreats.length, "catSumm": catSumm});
						});
					});
				},
				function(callback) {
					// Ambil jumlah high threats
					AnalysedInfo.find({$and:[{"eventDaerahTk1" : province},{"threatWarning": "high"}]}, function(err, highthreats) {
						if (err)
							res.send(err);

						// callback(null, highthreats.length);

						// ambil summari kategori
						AnalysedInfo.distinct("categoryMain", {$and: [{"eventDaerahTk1" : province}, {"threatWarning":"high"}]}, function(err, catSumm) {
							if (err)
								res.send(err);

							callback(null, {"nHigh": highthreats.length, "catSumm": catSumm});
						});
					});
				}
			],
			// optional callback
			function(err, results) {
				// results is now equal to ['one', 'two']
				if (err) fn(err);

				// push the array
				AnalysedInfo
				.where('eventDaerahTk1', province)
				.select('eventLat eventLon') 		// hanya mengambil field eventLat dan eventLon
				.limit(1)
				.exec(function (err, docs) {
					newSumm.lokasi = province;
					newSumm.nLow = results[0].nLow;
					newSumm.nMed = results[1].nMed;
					newSumm.nHigh = results[2].nHigh;
					newSumm.lowCatSumm = results[0].catSumm;
					newSumm.medCatSumm = results[1].catSumm;
					newSumm.highCatSumm = results[2].catSumm;
					newSumm.lat = docs[0].eventLat;
					newSumm.lon = docs[0].eventLon;

					summArr.push(newSumm);
				
					// tell the each async that the operation for each item is finished
					eachcallback();
				});
			});
		}, 
		function(err){
			if (err)
				fn(err);
			else
				fn(summArr);
		});
	}

	getCategorySummary = function (fn){
		console.log("getCategorySummary");
		summArr.length = 0;

		// Ambil list kota
		AnalysedInfo.distinct("eventDaerahTk1", function(err, provinces) {
			if (err)
				res.send(err);

			getProvCatSummary(provinces, fn);
		});
	}

	getProvCatSummary = function(provinces, fn)
	{
		async.each(provinces, function(province , eachcallback)
		{
			var newSumm = new Object();
			var catList = new Array();

			// iterate the array of kategori
			async.each(kategori, function(kat, katcallback) {
				// Perform operation on file here.
				// console.log('Processing category ' + kat);
				AnalysedInfo.find({$and:[{"eventDaerahTk1" : province},{"categoryMain": kat.main.name}]}, function(err, data) {
					if (err)
						res.send(err);

					var catSum = new Object();
					catSum.name = kat.main.name;
					catSum.n = data.length;

					catList.push(catSum);

					katcallback();
				});
			}, 
			function(err) {
				// if any of the file processing produced an error, err would equal that error
				if( err ) {
				  // One of the iterations produced an error.
				  // All processing will now stop.
				  console.log('Something wrong when processing category query');
				}

				AnalysedInfo
				.where('eventDaerahTk1', province)
				.select('eventLat eventLon') 		// hanya mengambil field eventLat dan eventLon
				.limit(1)
				.exec(function (err, docs) {
					newSumm.lokasi = province;
					newSumm.lat = docs[0].eventLat;
					newSumm.lon = docs[0].eventLon;
					newSumm.category = catList;

					summArr.push(newSumm);
				
					// tell the each async that the operation for each item is finished
					eachcallback();
				});
			});

		}, 
		function(err){
			if (err)
				fn(err);
			else
				fn(summArr);
		});
	}

	getPiechartSummary = function (fn, paramwaktu, paramsource){
		console.log("getPiechartSummary " + paramwaktu + " " + paramsource);
		summArr.length = 0;

		// Ambil list kota
		AnalysedInfo.distinct("categoryMain", function(err, categories) {
			if (err)
				res.send(err);

			getPiechartData(categories, fn, paramwaktu, paramsource);
		});
	}

	getPiechartData = function(categories, fn, paramwaktu, paramsource)
	{
		async.each(categories, function(category , eachcallback)
		{
			var newSumm = new Object();

			var start;
			var today = new Date();
			if (paramwaktu == "lastday"){start = new Date().setDate(today.getDate()-1)};
			if (paramwaktu == "lastweek"){start = new Date().setDate(today.getDate()-7)};
			if (paramwaktu == "lastmonth"){start = new Date().setDate(today.getDate()-30)};
			if (paramwaktu == "lastyear"){start = new Date().setDate(today.getDate()-365)};
			
			if (paramsource == "all"){
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : category},
						{'eventDateDate': {$gt: new Date(start)}}
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = category;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					eachcallback();
				});
			} 
			else {
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : category},
						{'dataSource': paramsource},
						{'eventDateDate': {$gt: new Date(start)}} //sama dengan date.month bulan ini
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = category;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					eachcallback();
				});
			}
		}, 
		function(err){
			if (err)
				fn(err);
			else
				fn(summArr);
		});
	}

	getPiechartCategorySummary = function (fn, paramCat, paramwaktu, paramsource){
		console.log("getPiechartCategorySummary " + paramCat + " " + paramwaktu + " " + paramsource);
		summArr.length = 0;

		// Ambil list subcategory dari maincategory tertentu
		AnalysedInfo.distinct("categorySub1", {"categoryMain" : paramCat}, function(err, subcategories) {
			if (err)
				res.send(err);

			getPiechartCategoryData(subcategories, fn, paramCat, paramwaktu, paramsource);
		});
	}

	getPiechartCategoryData = function(subcategories, fn, paramCat, paramwaktu, paramsource)
	{
		var start;
		var today = new Date();
		if (paramwaktu == "lastday"){start = new Date().setDate(today.getDate()-1)};
		if (paramwaktu == "lastweek"){start = new Date().setDate(today.getDate()-7)};
		if (paramwaktu == "lastmonth"){start = new Date().setDate(today.getDate()-30)};
		if (paramwaktu == "lastyear"){start = new Date().setDate(today.getDate()-365)};

		if (subcategories.length == 0) {
			var newSumm = new Object();
			// just get the categoryMain data
			if (paramsource == "all"){
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : paramCat},
						{'eventDateDate': {$gt: new Date(start)}}
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = paramCat;
					newSumm.amount = info.length;
					summArr.push(newSumm);
				});
			} 
			else {
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : paramCat},
						{'dataSource': paramsource},
						{'eventDateDate': {$gt: new Date(start)}} //sama dengan date.month bulan ini
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = paramCat;
					newSumm.amount = info.length;
					summArr.push(newSumm);
				});
			}

			fn(summArr);

		} else if (subcategories.length > 0) {

			async.each(subcategories, function(subcategory , eachcallback)
			{
				var newSumm = new Object();
				
				if (paramsource == "all"){
					AnalysedInfo.find({
						$and: [
							{'categoryMain' : paramCat},
							{'categorySub1' : subcategory},
							{'eventDateDate': {$gt: new Date(start)}}
						]
					}, function (err, info) {
						if (err)
							fn(err);

						newSumm.category = subcategory;
						newSumm.amount = info.length;
						summArr.push(newSumm);

						eachcallback();
					});
				} 
				else {
					AnalysedInfo.find({
						$and: [
							{'categoryMain' : paramCat},
							{'categorySub1' : subcategory},
							{'dataSource': paramsource},
							{'eventDateDate': {$gt: new Date(start)}} //sama dengan date.month bulan ini
						]
					}, function (err, info) {
						if (err)
							fn(err);

						newSumm.category = subcategory;
						newSumm.amount = info.length;
						summArr.push(newSumm);

						eachcallback();
					});
				}
			}, 
			function(err){
				if (err)
					fn(err);
				else
					fn(summArr);
			});
		}
	}

	getPiechartThreatSummary = function (fn, paramLev, paramwaktu, paramsource){
		console.log("getPiechartThreatSummary " + paramLev + " " + paramwaktu + " " + paramsource);
		summArr.length = 0;

		// Ambil list kota
		AnalysedInfo.distinct("categoryMain", function(err, categories) {
			if (err)
				res.send(err);

			getPiechartThreatData(categories, fn, paramLev, paramwaktu, paramsource);
		});
	}

	getPiechartThreatData = function(categories, fn, paramLev, paramwaktu, paramsource)
	{
		async.each(categories, function(category , eachcallback)
		{
			var newSumm = new Object();

			var start;
			var today = new Date();
			if (paramwaktu == "lastday"){start = new Date().setDate(today.getDate()-1)};
			if (paramwaktu == "lastweek"){start = new Date().setDate(today.getDate()-7)};
			if (paramwaktu == "lastmonth"){start = new Date().setDate(today.getDate()-30)};
			if (paramwaktu == "lastyear"){start = new Date().setDate(today.getDate()-365)};
			
			if (paramsource == "all"){
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : category},
						{'threatWarning' : paramLev},
						{'eventDateDate': {$gt: new Date(start)}}
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = category;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					eachcallback();
				});
			} 
			else {
				AnalysedInfo.find({
					$and: [
						{'categoryMain' : category},
						{'threatWarning' : paramLev},
						{'dataSource': paramsource},
						{'eventDateDate': {$gt: new Date(start)}} //sama dengan date.month bulan ini
					]
				}, function (err, info) {
					if (err)
						fn(err);

					newSumm.category = category;
					newSumm.amount = info.length;
					summArr.push(newSumm);

					eachcallback();
				});
			}
		}, 
		function(err){
			if (err)
				fn(err);
			else
				fn(summArr);
		});
	}

	getLinechartSummary = function (fn, paramwaktu, paramsource){
		console.log("getLinechartSummary " + paramwaktu + " " + paramsource);

		var nTimes;
		if (paramwaktu == "lastday") nTimes = 1;
		else if (paramwaktu == "lastweek") nTimes = 7;
		else if (paramwaktu == "lastmonth") nTimes = 30;
		else if (paramwaktu == "lastyear") nTimes = 365;

		async.times(nTimes, getLinechartData, function (err, resultArray) {
			if (err) fn(err);

			console.log("getLinechartData result ", resultArray);
			fn(resultArray);
		});

		function getLinechartData (iter, callback1)
		{
			var today = new Date();
			var theDate = new Date(new Date().setDate(today.getDate()-iter));
			var theDateObj = new Object();
			theDateObj.year = 1900 + theDate.getYear();
			theDateObj.month = theDate.getMonth();
			theDateObj.date = theDate.getDate();
			var theDateBefore = new Date(new Date().setDate(today.getDate()-iter-1));
			var theDateBeforeObj = new Object();
			theDateBeforeObj.year = 1900 + theDateBefore.getYear();
			theDateBeforeObj.month = theDateBefore.getMonth();
			theDateBeforeObj.date = theDateBefore.getDate();

			var threatLevels = ["low","high","medium"];
			async.map(threatLevels, getThreatPerDay, function (err, result) {
				if (err) console.log('Error: ' + err);
				
				// console.log('Finished: ', result);
				var linechartData = new Object();
				linechartData.date = dateFormat(theDateBefore, "yyyy-mm-dd");
				for (var i = 0; i < result.length; i++) {
					linechartData[result[i].desc] = result[i].n;
				}
				callback1(null, linechartData);
			});

			function getThreatPerDay(threat, callback2) {
				if (paramsource == "all") 
				{
					AnalysedInfo.find({$and : [
							{"threatWarning": threat},
							{'eventDateDate': {$gte: new Date(theDateBeforeObj.year, theDateBeforeObj.month, theDateBeforeObj.date)}},
							{'eventDateDate': {$lt: new Date(theDateObj.year, theDateObj.month, theDateObj.date)}}
						]
					}, function(err, doc) {
						if (err) console.log(err);

						callback2(null, {"desc" : threat, "n": doc.length});
					});
				} else {
					AnalysedInfo.find({$and : [
							{"threatWarning": threat},
                      		{'dataSource': paramsource},
							{'eventDateDate': {$gte: new Date(theDateBeforeObj.year, theDateBeforeObj.month, theDateBeforeObj.date)}},
							{'eventDateDate': {$lt: new Date(theDateObj.year, theDateObj.month, theDateObj.date)}}
						]
					}, function(err, doc) {
						if (err) console.log(err);

						callback2(null, {"desc" : threat, "n": doc.length});
					});
				}
			}
		}
	}

	getLinechartCategorySummary = function (fn, paramCat, paramwaktu, paramsource){
		console.log("getLinechartCategorySummary " + paramCat + " " + paramwaktu + " " + paramsource);

		var nTimes;
		if (paramwaktu == "lastday") nTimes = 1;
		else if (paramwaktu == "lastweek") nTimes = 7;
		else if (paramwaktu == "lastmonth") nTimes = 30;
		else if (paramwaktu == "lastyear") nTimes = 365;

		async.times(nTimes, getLinechartData, function (err, resultArray) {
			if (err) fn(err);

			// console.log("getLinechartData result ", resultArray);
			fn(resultArray);
		});

		function getLinechartData (iter, callback1)
		{
			var today = new Date();
			var theDate = new Date(new Date().setDate(today.getDate()-iter));
			var theDateObj = new Object();
			theDateObj.year = 1900 + theDate.getYear();
			theDateObj.month = theDate.getMonth();
			theDateObj.date = theDate.getDate();
			var theDateBefore = new Date(new Date().setDate(today.getDate()-iter-1));
			var theDateBeforeObj = new Object();
			theDateBeforeObj.year = 1900 + theDateBefore.getYear();
			theDateBeforeObj.month = theDateBefore.getMonth();
			theDateBeforeObj.date = theDateBefore.getDate();

			var threatLevels = ["low","high","medium"];
			async.map(threatLevels, getThreatPerDay, function (err, result) {
				if (err) console.log('Error: ' + err);
				
				// console.log('Finished: ', result);
				var linechartData = new Object();
				linechartData.date = dateFormat(theDateBefore, "yyyy-mm-dd");
				for (var i = 0; i < result.length; i++) {
					linechartData[result[i].desc] = result[i].n;
				}
				callback1(null, linechartData);
			});

			function getThreatPerDay(threat, callback2) {
				if (paramsource == "all") 
				{
					AnalysedInfo.find({$and : [
							{"threatWarning": threat},
							{'eventDateDate': {$gte: new Date(theDateBeforeObj.year, theDateBeforeObj.month, theDateBeforeObj.date)}},
							{'eventDateDate': {$lt: new Date(theDateObj.year, theDateObj.month, theDateObj.date)}},
							{'categoryMain' : paramCat}
						]
					}, function(err, doc) {
						if (err) console.log(err);

						callback2(null, {"desc" : threat, "n": doc.length});
					});
				} else {
					AnalysedInfo.find({$and : [
							{"threatWarning": threat},
                      		{'dataSource': paramsource},
							{'eventDateDate': {$gte: new Date(theDateBeforeObj.year, theDateBeforeObj.month, theDateBeforeObj.date)}},
							{'eventDateDate': {$lt: new Date(theDateObj.year, theDateObj.month, theDateObj.date)}},
							{'categoryMain' : paramCat}
						]
					}, function(err, doc) {
						if (err) console.log(err);

						callback2(null, {"desc" : threat, "n": doc.length});
					});
				}
			}
		}
	}

	getLinechartThreatSummary = function (fn, paramLev, paramwaktu, paramsource){
		console.log("getLinechartThreatSummary " + paramLev + " " + paramwaktu + " " + paramsource);

		var nTimes;
		if (paramwaktu == "lastday") nTimes = 1;
		else if (paramwaktu == "lastweek") nTimes = 7;
		else if (paramwaktu == "lastmonth") nTimes = 30;
		else if (paramwaktu == "lastyear") nTimes = 365;

		async.times(nTimes, getLinechartData, function (err, resultArray) {
			if (err) fn(err);

			console.log("getLinechartData result ", resultArray);
			fn(resultArray);
		});

		function getLinechartData (iter, callback1)
		{
			var today = new Date();
			var theDate = new Date(new Date().setDate(today.getDate()-iter));
			var theDateObj = new Object();
			theDateObj.year = 1900 + theDate.getYear();
			theDateObj.month = theDate.getMonth();
			theDateObj.date = theDate.getDate();
			var theDateBefore = new Date(new Date().setDate(today.getDate()-iter-1));
			var theDateBeforeObj = new Object();
			theDateBeforeObj.year = 1900 + theDateBefore.getYear();
			theDateBeforeObj.month = theDateBefore.getMonth();
			theDateBeforeObj.date = theDateBefore.getDate();

			var threatLevels = ["low","high","medium"];
			async.map(threatLevels, getThreatPerDay, function (err, result) {
				if (err) console.log('Error: ' + err);
				
				// console.log('Finished: ', result);
				var linechartData = new Object();
				linechartData.date = dateFormat(theDateBefore, "yyyy-mm-dd");
				for (var i = 0; i < result.length; i++) {
					linechartData[result[i].desc] = result[i].n;
				}
				callback1(null, linechartData);
			});

			function getThreatPerDay(threat, callback2) {
				if (threat == paramLev) {
					if (paramsource == "all") 
					{
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
								{'eventDateDate': {$gte: new Date(theDateBeforeObj.year, theDateBeforeObj.month, theDateBeforeObj.date)}},
								{'eventDateDate': {$lt: new Date(theDateObj.year, theDateObj.month, theDateObj.date)}}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					} else {
						AnalysedInfo.find({$and : [
								{"threatWarning": threat},
	                      		{'dataSource': paramsource},
								{'eventDateDate': {$gte: new Date(theDateBeforeObj.year, theDateBeforeObj.month, theDateBeforeObj.date)}},
								{'eventDateDate': {$lt: new Date(theDate)}}
							]
						}, function(err, doc) {
							if (err) console.log(err);

							callback2(null, {"desc" : threat, "n": doc.length});
						});
					}
				} else {
					callback2(null, {"desc" : threat, "n": 0});
				}
			}
		}
	}

	/*make some functions as public */
	return {
		getProvinceSummary : function(fn){
			getProvinceSummary(fn);
		},
		getCategorySummary : function(fn){
			getCategorySummary(fn);
		},
		getPiechartSummary : function(fn, paramwaktu, paramsource){
			getPiechartSummary(fn, paramwaktu, paramsource);
		},
		getPiechartCategorySummary : function(fn, paramCat, paramwaktu, paramsource){
			getPiechartCategorySummary(fn, paramCat, paramwaktu, paramsource);
		},
		getPiechartThreatSummary : function(fn, paramLev, paramwaktu, paramsource){
			getPiechartThreatSummary(fn, paramLev, paramwaktu, paramsource);
		},
		getLinechartSummary : function(fn, paramwaktu, paramsource){
			getLinechartSummary(fn, paramwaktu, paramsource);
		},
		getLinechartCategorySummary : function(fn, paramCat, paramwaktu, paramsource){
			getLinechartCategorySummary(fn, paramCat, paramwaktu, paramsource);
		},
		getLinechartThreatSummary : function(fn, paramLev, paramwaktu, paramsource){
			getLinechartThreatSummary(fn, paramLev, paramwaktu, paramsource);
		}
	}
}