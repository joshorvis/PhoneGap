var pfFilters = angular.module('PFunc.filters', []);

pfFilters.filter('checkmark', [function() {
  return function(input) {
    return input ? '\u2713' : '\u2718';
  };
}]);

pfFilters.filter('without', [function() {
	return function(input, filterArray, filterKey) {
		var ret = [];
		if(!filterArray || !filterArray.length)
			return input;
		if(!filterKey) {
			angular.forEach(input, function(val) {
				if(!_.contains(filterArray, val))
					ret.push(val);
			});
		} else {
			var inputKeys = _.pluck(input, filterKey);
			var filterKeys = _.pluck(filterArray, filterKey);

			angular.forEach(inputKeys, function(val, idx) {
				if(!_.contains(filterKeys, val))
					ret.push(input[idx]);
			});
		}
		return ret;
	}
}]);

pfFilters.filter('themAndMe',[function() {
	return function (input, filterArray, filterKey) {
		var ret = [];
		for (var i = 0; i < input.length; i++) {
			var item = input[i];
			if (item.id == filterArray.userId || item.instanceId == filterArray.instanceId) {
				ret.push(item);
			}
		}

		return ret;
	}
}]);

	pfFilters.filter('jsonFull', [function () {
		return function (object) {
			return JSON.stringify(object, function (key, value) {
				return value;
			}, '  ');
		};
	}]);
	pfFilters.filter('renderHTML', ['$sce', function($sce){
		return function(text) {
			return $sce.trustAsHtml(text);
		};
	}]);

	pfFilters.filter('customCurrency',['$filter',function($filter) {
		var currencyFilter = $filter('currency');
		return function(amount) {
			if (amount < 0) {
				var amt = currencyFilter(amount);
				amt = amt.replace('(','');
				amt = amt.replace(')','');
				return '<span class="negative-balance"> -' + amt + '</span>';
			} else {
				return currencyFilter(amount);
			}

		}
	}]);

	pfFilters.filter('YesNo',[function() {
		return function(x) {
			if (x === undefined) {
				return 'No';
			} else if (x.length == 0) {
				return '';
			} else if (x) {
				return 'Yes';
			} else {
				return 'No';
			}
		}
	}]);
	pfFilters.filter('OpenClosed',[function() {
		return function(value) { return value ? 'Open' : 'Closed'};
	}]);

	pfFilters.filter('daterange', [function () {
		return function(items, date_field, start_date, end_date) {
			var result = [];

			// date filters
			var startDate = (start_date && !isNaN(Date.parse(start_date))) ? Date.parse(start_date) : Date.parse('01/01/1960');
			var endDate = (end_date && !isNaN(Date.parse(end_date))) ? Date.parse(end_date) : Date.parse('12/31/2044');

			// if the conversations are loaded
			if (items && items.length > 0) {

				angular.forEach(items, function (item,index) {
					var itemDate = Math.abs(Date.parse(item[date_field]));

					if (itemDate >= startDate && itemDate <= endDate) {
						result.push(item);
					}
				});

				return result;
			}
		};
	}]);


// TODO: Verify the below filters


// 11/21/12: daden: a function to deal with local time; adapted from http://jsfiddle.net/8Ru6r/1/
	pfFilters.filter('localtime', [function() {
		return function(d) {
			d = typeof(d) === 'object' ? d.toUTCString() : d;
			return d.replace(
				/^(?:\d\d\d\d-\d\d-\d\dT)?\d\d:\d\d(?::\d\d(?:\.\d+)?)?$/,
				function($0) {
					var offset = (new Date).getTimezoneOffset(),
						hours = Math.floor(Math.abs(offset)/60),
						minutes = Math.abs(offset)%60,
						sign = offset<=0 ? '+' : '-',
						tz = (sign+(hours*100+minutes))
							.replace(/^([-+])(\d\d\d)$/, '$10$2');

					return $0+tz;
				});
		}
	}]);

	pfFilters.filter('isEmpty', [function () {
		var key;
		return function (obj) {
			for (key in obj) {
				if (obj.hasOwnProperty(key)) {
					return false;
				}
			}
			return true;
		};
	}]);