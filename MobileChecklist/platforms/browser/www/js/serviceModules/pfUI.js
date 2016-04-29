var pfUI = angular.module('pfUI',['ui.date','uiSwitch','colorpicker.module','ckeditor','artemdemo.popup']);

pfUI.directive('pfSortable',[function() {
	return {
		restrict: 'A'
		,scope: true
		,controller: function($scope,$element) {

		}
		,link: function(scope,element,attrs) {
			//console.log('attrs.onupdate',attrs.onupdate,scope.$eval(attrs.onupdate));
			var allowCrossover = false;

			if (attrs.crossover) {
				allowCrossover = true;
				var crossoverClass = attrs.crossover;
			}
			if (!attrs.onremove && !attrs.onreceive) allowCrossover = false;

			attrs.onupdate = scope.$eval(attrs.onupdate) || angular.noop;
			attrs.onreceive = scope.$eval(attrs.onreceive) || angular.noop;
			attrs.onremove = scope.$eval(attrs.onremove) || angular.noop;

			$(element).sortable({
				cancel: '.sortable-false, input, textarea, button, i'
				,update: function(event,ui) {
					//console.log('firing sortable update',event,ui);
					var idOrder = $(element).sortable('toArray');

					attrs.onupdate(idOrder,ui);

				}
			});

			if (allowCrossover) {
				$(element).sortable('option',{
					remove: function(event,ui) {
						var idOrder = $(element).sortable('toArray');
						attrs.onremove(event,ui,idOrder);
					}
					,receive: function(event,ui) {
						var idOrder = $(element).sortable('toArray');
						attrs.onreceive(event,ui,idOrder);
					}
					,connectWith: crossoverClass
				});
			}

			//$(element).children('.noSelect').disableSelection();
		}
	}
}]);

pfUI.directive('pfResizable',[function() {
	return {
		restrict: 'A'
		,scope: true
		,controller: function($scope,$element) {

		}
		,link: function(scope,element,attrs) {

			attrs.onstop = scope.$eval(attrs.onstop) || angular.noop;
			var resizeOpts = {
				stop: function(event,ui) {
					attrs.onstop(event,ui);
				}
			};

			attrs.resizechildren = attrs.resizechildren || null;
			if (attrs.resizechildren) {
				resizeOpts.alsoResize = $(element).children(attrs.resizechildren);
			}

			attrs.minheight = scope.$eval(attrs.minheight) || null;
			attrs.maxheight = scope.$eval(attrs.maxheight) || null;
			if (attrs.minheight) {
				resizeOpts.minHeight = attrs.minheight;
			}
			if (attrs.maxheight) {
				resizeOpts.maxHeight = attrs.maxheight;
			}

			attrs.minwidth = scope.$eval(attrs.minwidth) || null;
			attrs.maxwidth = scope.$eval(attrs.maxwidth) || null;
			if (attrs.minwidth) {
				resizeOpts.minWidth = attrs.minwidth;
			}
			if (attrs.maxwidth) {
				resizeOpts.maxWidth = attrs.maxwidth;
			}

			if (attrs.handles) {
				resizeOpts.handles = attrs.handles;
			}
			if (attrs.cancelselector) {
				resizeOpts.cancel = attrs.cancelselector;
			}

			$(element).resizable(resizeOpts);

		}
	}
}]);

pfUI.service('pfUIService',[function() {
	this.getStatusIndicator = function(dueDate) {
		var now = new Date().getTime();

		var then = new Date(dueDate).getTime();

		var oneDay = 24 * 60 * 60 * 1000;

		if (then < now) {
			//console.log('less than 7');
			return '<i class="fa fa-fw fa-circle indicator-status indicator-status-red"></i>';
		} else if (then - now < (7 * oneDay)) {
			//console.log("now-then is greater than 7 days");
			return '<i class="fa fa-fw fa-circle-o indicator-status indicator-status-yellow"></i>';
		} else {
			//console.log('else');
			return '<i class="fa fa-fw fa-circle-thin indicator-status indicator-status-green"></i>';
		}
	};

	this.getBackgroundColorCSS = function(defaultColor,optColor) {
		var colr = optColor || defaultColor;
		if (colr) {
			if (colr.length == 6) {
				colr = '#'+colr;
			}
		} else {
			colr = '#ffffff';
		}
		return " background-color: " + colr + "; ";
	};

	this.getTextColorCSS = function(defaultColor,optColor) {

		var colr = optColor || defaultColor;
		if (colr) {
			if (colr.length == 6) {
				colr = '#'+colr;
			}
		} else {
			colr = '#000000';
		}
		return " color: " + colr + "; ";
	};

	this.reformatDate = function(dateInput,includeTime) {
		if (dateInput) {
			dateInput = dateInput.toString();
			var newDate;
			var regEx = /^\d{4}-\d{2}-\d{2}$/;
			var isAlreadyValidDate = dateInput.match(regEx);

			if (isAlreadyValidDate != null) {
				//console.log('valid date',dateInput);
				newDate = dateInput;
			} else {
				var d = new Date(dateInput);
				var year = d.getFullYear();
				if (year < 1980) year += 100;  // Firefox and IE are stupid, and thing that "15" is "1915"
				var month = (d.getMonth() + 1);
				month = month < 10 ? '0'+month : month;
				var day = (d.getDate() < 10 ? '0'+ d.getDate() : d.getDate());
				newDate = year + '-' + month + '-' + day;
				//console.log('dateInput is ',typeof dateInput);
				//console.log('converting date',isAlreadyValidDate,dateInput,newDate);
			}

			if (includeTime) newDate += 'T12:00:00.000Z';

			return newDate;
		}
	};

	this.constrainJobWindow = function(event,ui) {
		var _allowOverlap = true;
		var _overlapByPercent = true;

		var _offsetHoriz = 280;
		var _offsetVert = -60;
		var _overlapDistance = 150;
		var _overlapPercent = 75;
		var _margin = 5;

		var topBorder = _offsetVert + 45;
		var bottomBorder = _offsetVert + window.innerHeight - 50;

		var leftBorder = _offsetHoriz + 5;
		var rightBorder = ((window.innerWidth + _offsetHoriz) - event.target.clientWidth) - 5;

		if (_allowOverlap) {
			if (_overlapByPercent) {
				_overlapDistance = event.target.clientWidth * (_overlapPercent / 100);
			}

			leftBorder -= _overlapDistance;
			rightBorder += _overlapDistance;
		}

		if (event.clientX != event.pageX) {
			window.pageXOffset = (event.clientX - event.pageX);
		} else if (window.pageXOffset > 0) {
			window.pageXOffset = 0;
		}

		if (event.clientY != event.pageY) {
			window.pageYOffset = (event.clientY - event.pageY);
		} else if (window.pageYOffset > 0) {
			window.pageYOffset = 0;
		}

		if (ui.position.left < leftBorder) {
			ui.position.left = leftBorder;
		}

		if (ui.position.left > rightBorder) {
			ui.position.left = rightBorder;
		}

		if (ui.position.top < topBorder) {
			ui.position.top = topBorder;
		}
		if (ui.position.top > bottomBorder) {
			ui.position.top = bottomBorder;
		}

		return ui.position;
	};

}]);

pfUI.controller('Select2Controller',['$scope','pfUtils','pfInstanceService',function($scope,pfUtils,pfInstanceService) {   //, $rootScope, $timeout

// Set up a filter to bounce us back to the login screen if the session has expired.
	$.ajaxSetup({
		dataFilter: function (data, type) {

// TODO:  Figure out why alerts aren't firing here....
			//alert('in dataFilter');
			//console.log(type,data);
			if (typeof type == 'undefined') {
				//console.log('type is undefined');

				//console.log(data.indexOf('loginPage'),data);

				if (data.indexOf('loginPage') > 0) {
					//console.log('returned html');
					//alert('You session has timed out.  Please login again');
					window.location = '/';
				} else {
					//console.log('regular data',data.indexOf('loginPage'));
					return data;
				}

			} else {
				return data;
			}

		}
	});

	$scope.controllerName = 'Select2Controller';

	$scope.statusItems = {
		allowClear: true
		,placeholder: 'Statuses'
		,minimumInputLength: 0
		,multiple: true
		,ajax: {
			url: 'http://192.168.1.5:83/remote2/EntityFacade.cfc?method=getListItems'
			,data: function (term) {
				return {
					searchTerm: term
					,list: 'statusNoteStatus'
				};
			}
			,results: function(data) {
				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data,function(item) {
					item.text = item.name;
					//console.log(item);
				});

				return {results:data};
			}
		}
	};

	$scope.budgetCodes = {
		allowClear: true
		,placeholder: 'Budget Code'
		,ajax: {
			url: "http://192.168.1.5:83/remote2/ExpenseFacade2.cfc?method=listBudgetCodes"
			,data: function (term) {
				return {
					searchTerm: term
					,instanceId: pfInstanceService.instanceId
					//,show: 'all'
				};
			}
			,results: function(data) {
				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data,function(item) {
					item.text = item.name + " | " + item.natAcctVal + '-' + item.fundVal + '-' + item.costCtrVal + '-' + item.projectVal + '-' + item.taskVal;
					//console.log(item);
				});

				return {results:data};
			}
		}
	};
	$scope.budgetCodesMulti = angular.copy($scope.budgetCodes);
	$scope.budgetCodesMulti.multiple = true;

	$scope.expenseName = {
		allowClear: true
		,placeholder: 'Expense Name'
		,minimumInputLength: 3
		,ajax: {
			url: "http://192.168.1.5:83/remote2/ExpenseFacade2.cfc?method=getExpenseNames"
			,data: function (term) {
				return {
					searchTerm: term
					,instanceId: pfInstanceService.instanceId
					,active: 'all'
				};
			}
			,results: function(data) {
				var ret = [];

				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data,function(item) {
					//console.log(item);

					item.text = item.name;
					//console.log(item);
				});

				return {results:data};
			}
		}
		,formatResult: function(item) {
			if (!item.id) { return item.text };  // if there is an optgroup

			var ret = '<div class="expense-search-result">';
			ret += '<div class="search-result-number label"> Expense #' + item.expenseId + ' (' + item.instancePrefix + ')</div>';
			ret += '<div class="search-result-name">' + item.name + '</div>';
			if (item.description && item.description.length) {
				ret += '<div class="search-result-description">' + item.description + '</div>';
			}
			ret += '<div class="clearfix" /></div>';

			return ret;

		}
		,formatSelection: function(item) {
			return item.name + '    Expense #' + item.expenseId;
		}
	};
	$scope.expenseNameMulti = angular.copy($scope.expenseName);
	$scope.expenseNameMulti.multiple = true;

	$scope.expenseJobName = {
		allowClear: true
		,placeholder: 'Job Name'
		,minimumInputLength: 3
		,ajax: {
			url: "http://192.168.1.5:83/remote2/JobFacade.cfc?method=searchJobs",
			data: function (term, page) {
				return {
					str: term
					,active: 'all'
					,jobTypes: 'project,task,subtask'
				}; // query params go here
			},
			results: function (data, page) { // parse the results into the format expected by Select2.
				// since we are using custom formatting functions we do not need to alter remote JSON data
				var ret = [];
				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data, function(item) {
					item.text = item.jobId + " - " + item.name;
				});

				data = _.groupBy(data, 'type');
				angular.forEach(data, function(group, groupName) {
					ret.push({
						text: groupName + 's',
						children: group
					})
				});

				return {results:_.sortBy(ret, 'text')};
			}
		}
		,formatResult: function(item) {
			if (!item.id) {
				return item.text;
			}  // if there is an optgroup

			var ret = '';
			ret += '<div class="expense-search-result">';
			ret += '<div class="search-result-number label color-'+ item.type.toLowerCase() + '">' + item.type + ' ' + item.instancePrefix + '-' + item.jobId + '</div>';
			ret += '<div class="search-result-name">' + item.name + "</div>";
			if (item.description && item.description.length) {
				ret += '<div class="search-result-description">' + item.description.substr(0,150) + (item.description.length >= 150 ? '...' : '') + '</div>';
			}
			ret += '</div>';
			return ret;
		}
		,formatSelection: function(item) {
			return item.jobId + " - " + item.name;
		}
	};
	$scope.expenseJobNameMulti = angular.copy($scope.expenseJobName);
	$scope.expenseJobNameMulti.multiple = true;

	/*$scope.jobName = {
	 allowClear: true
	 ,placeholder: 'Job Name'
	 ,minimumInputLength: 3
	 ,ajax: {
	 url: "remote2/JobFacade.cfc?method=searchJobs",
	 data: function (term, page) {
	 return {
	 str: term
	 ,active: 'all'
	 }; // query params go here
	 },
	 results: function (data, page) { // parse the results into the format expected by Select2.
	 // since we are using custom formatting functions we do not need to alter remote JSON data
	 var ret = [];

	 data = pfUtils.guaranteeArray(data);
	try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

	 angular.forEach(data, function(item) {
	 //console.log(item);
	 item.text = item.jobId + " - " + item.name;
	 });

	 data = _.groupBy(data, 'type');
	 angular.forEach(data, function(group, groupName) {
	 ret.push({
	 text: groupName + 's',
	 children: group
	 })
	 });

	 //console.log(_.sortBy(ret, 'text'));
	 return {results:_.sortBy(ret, 'text')};
	 }
	 }
	 ,formatResult: function(item) {
	 if (!item.id) { return item.text };  // if there is an optgroup

	 var ret = '';
	 ret += '<div class="expense-search-result">';
	 ret += '<div class="search-result-number label">Job ' + item.jobId + '</div>';
	 ret += '<div class="search-result-name">' + item.name + "</div>";
	 if (item.description && item.description.length) {
	 ret += '<div class="search-result-description">' + item.description + '</div>';
	 }
	 ret += '</div>';
	 return ret;
	 }
	 ,formatSelection: function(item) {
	 return item.jobId + " - " + item.name;
	 }
	 };*/

	$scope.vendor = {
		allowClear: true
		,placeholder: 'Vendor Name'
		,ajax: {
			url: "http://192.168.1.5:83/remote2/VendorFacade.cfc?method=listVendors"
			,data: function (term) {
				return {
					searchTerm: term
					,active: 1
					,instanceId: pfInstanceService.instanceId
				};
			}
			,results: function(data) {
				var ret = [];

				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data,function(item) {
					item.text = item.name ;
					//console.log(item);
				});

				//console.log({results:data});
				return {results:data};
			}
		}
	};
	$scope.vendorMulti = angular.copy($scope.vendor);
	$scope.vendorMulti.multiple = true;


	$scope.invoiceNumber = {
		allowClear: true
		,placeholder: 'Invoice Number'
		,minimumInputLength: 2
		,ajax: {
			url: "http://192.168.1.5:83/remote2/ExpenseFacade2.cfc?method=getExpenseNames"
			,data: function(term) {
				return {
					invoiceNum: term
					,active: 'all'
				}
			}
			,results: function(data) {
				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data,function(item) {
					var num = '';
					if (item.invoiceNum) {
						num += "Invoice #" + item.invoiceNum;
					}
					if (item.SOWNum) {
						if (item.invoiceNum) {
							num += "; ";
						}
						num += "SOW #" + item.SOWNum;
					}
					item.text = num + " - " + item.name;
				});

				return {results:data};
			}
		}
		,formatResult: function(item) {
			var ret = '';
			ret += '<div class="expense-search-result">';
			if (item.invoiceNum) {
				ret += '<div class="search-result-number label label-warning">Invoice ' + item.invoiceNum + '</div>';
			}
			if (item.SOWNum) {
				ret += '<div class="search-result-number label label-info">SOW ' + item.SOWNum + '</div>';
			}
			ret += '<div class="search-result-name">' + item.name + "</div>";
			if (item.description && item.description.length) {
				ret += '<div class="search-result-description">' + item.description + '</div>';
			}
			ret += '</div>';
			return ret;
		}
		,formatSelection: function(item) {
			var num = '';
			if (item.invoiceNum) {
				num += "Invoice #" + item.invoiceNum;
			}
			if (item.SOWNum) {
				if (item.invoiceNum) {
					num += "; ";
				}
				num += "SOW #" + item.SOWNum;
			}
			return num + " - " + item.name;
		}
	};
	$scope.invoiceNumberMulti = angular.copy($scope.invoiceNumber);
	$scope.invoiceNumberMulti.multiple = true;

	$scope.users = {
		allowClear: true
		,placeholder: 'Users'
		,minimumInputLength: 1
		,multiple: true
		,ajax: {
			url: "http://192.168.1.5:83/remote2/UserFacade.cfc?method=listUsers"
			,data: function(term) {
				return {
					searchTerm: term
					,show: 'active'
					,instanceId: pfInstanceService.instanceId
				}
			}
			,results: function(data) {
				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data,function(item) {
					item.text = item.name;
				});
				return { results:data };
			}
		}
		,formatResult: function(item) {
			//console.log('from formatResult',item);
			return item.name;
		}
		,formatSelection: function(item) {
			//console.log("from formatSelection",item);
			return item.name;
		}
	};
	$scope.allUsers = {
		allowClear: true
		,placeholder: 'Users'
		,minimumInputLength: 1
		,multiple: true
		,ajax: {
			url: "http://192.168.1.5:83/remote2/UserFacade.cfc?method=listUsers"
			,data: function(term) {
				return {
					searchTerm: term
					,show: 'active'
				}
			}
			,results: function(data) {
				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data,function(item) {
					item.text = item.name;
				});

				//console.log('results from allUsers',data);

				var groupedData = _.groupBy(data,function(item) {
					return item.instanceId;
				});
				var ret = [];
				for (var key in groupedData) {
					var optgroup = {
						groupId: key
						,groupName: groupedData[key][0].instancePrefix
						,children: groupedData[key]
					};
					ret.push(optgroup);
				}
				//console.log('ret',ret);


				return { results:ret };
			}
		}
		,formatResult: function(item) {
			if (item.groupName) {
				return item.groupName;
			} else {
				return item.name;
			}
		}
		,formatSelection: function(item) {
			//console.log("from formatSelection",item);
			return item.name;
		}
	};

	$scope.picklistJobs = {
		allowClear: true
		,placeholder: 'Choose one or more jobs'
		,minimumInputLength: 2
		//,minimumInputLength: 1
		,multiple: true
		,ajax: {
			url: "http://192.168.1.5:83/remote2/JobFacade.cfc?method=searchJobs",
			data: function (term, page) {
				return {
					str: term
					,active: 1
					,jobTypes: 'campaign,project,task'
				}; // query params go here
			},
			results: function (data, page) { // parse the results into the format expected by Select2.
				// since we are using custom formatting functions we do not need to alter remote JSON data
				var ret = [];
				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};
				//console.log('data from results',data);

				angular.forEach(data, function(item) {
					item.text = item.jobId + " - " + item.name;
				});

				data = _.groupBy(data, 'type');
				angular.forEach(data, function(group, groupName) {
					ret.push({
						text: groupName + 's',
						children: group
					})
				});

				return {results:_.sortBy(ret, 'text')};
			}
		}
		,formatResult: function(item) {
			if (!item.id) {
				return item.text;
			}  // if there is an optgroup

			var ret = '';
			ret += '<div class="expense-search-result">';
			ret += '<div class="search-result-number label color-'+ item.type.toLowerCase() + '">' + item.type + ' ' + item.jobId + '</div>';
			ret += '<div class="search-result-name">' + item.name + "</div>";
			if (item.description && item.description.length) {
				ret += '<div class="search-result-description">' + item.description + '</div>';
			}
			ret += '</div>';
			return ret;
		}
		,formatSelection: function(item) {
			//console.log('item',item);
			return item.type + ' ' + item.jobId + " - " + item.name;
		}
	};

	$scope.parentJobs = {
		allowClear: true
		,placeholder: 'Job Name (no subtasks)'
		,minimumInputLength: 2
		,ajax: {
			url: "http://192.168.1.5:83/remote2/JobFacade.cfc?method=searchJobs",
			data: function (term, page) {
				return {
					str: term
					,active: 1
					,instanceIds: pfInstanceService.instanceId
					,includeOwnedJobs: false
					,jobTypes: 'campaign,project,task'
				}; // query params go here
			},
			results: function (data, page) { // parse the results into the format expected by Select2.
				// since we are using custom formatting functions we do not need to alter remote JSON data
				var ret = [];
				data = pfUtils.guaranteeArray(data);
				try { data = JSON.parse(pfUtils.guaranteeArray(data)); } catch(e) {};

				angular.forEach(data, function(item) {
					item.text = item.jobId + " - " + item.name;
				});

				data = _.groupBy(data, 'type');
				angular.forEach(data, function(group, groupName) {
					ret.push({
						text: groupName + 's',
						children: group
					})
				});

				return {results:_.sortBy(ret, 'text')};
			}
		}
		,formatResult: function(item) {
			if (!item.id) {
				return item.text;
			}  // if there is an optgroup

			var ret = '';
			ret += '<div class="expense-search-result">';
			ret += '<div class="search-result-number label color-'+ item.type.toLowerCase() + '">' + item.type + ' ' + item.instancePrefix + '-' + item.jobId + '</div>';
			ret += '<div class="search-result-name">' + item.name + "</div>";
			if (item.description && item.description.length) {
				ret += '<div class="search-result-description">' + item.description + '</div>';
			}
			ret += '</div>';
			return ret;
		}
		,formatSelection: function(item) {
			//console.log('item',item);
			return item.jobId + " - " + item.name;
		}
	};

}]);

pfUI.controller('CKEditorController',['$scope',function($scope) {
	$scope.editorProfiles = {
		standard: {
			language: 'en',
			//allowedContent: true,
			entities: false
			//,scayt_autoStartup: false
			,toolbarCanCollapse: true
			,toolbarStartupExpanded: false
			,removeButtons: 'Anchor,Blockquote,Scyat,Styles,Table'
			,removePlugins: 'about,format,horizontalrule,image,maximize,sourcearea,specialchar,stylescombo,wsc'
			/*,toolbarGroups: [
				{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
				{ name: 'paragraph',   groups: [ 'list', 'indent', 'align' ] },
				{ name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
				{ name: 'links' }
			]*/
			,contentsCss: '/css/PFunc-CKeditor.css'
		}
	};
}]);

pfUI.service('pfUtils',['$rootScope',function($rootScope) {
	return {
		guaranteeArray: function(data) {
			try {
				// Handle unparsed JSON strings
				if (JSON.parse(data).constructor !== Array) {
					data = JSON.stringify([JSON.parse(data)]);
				}
			} catch(e) {
				// Handle parsed JSON strings
				if (data.constructor !== Array) {
					data = [data];
				}
			}
			return data;
		}
		,listFind: function(term,list) {
			var isFound = false;
			if (typeof list == 'string') list = list.split(',');
			for (var i in list) {
				if (list.hasOwnProperty(i) && list[i] == term) {
					isFound = true;
				}
			}
			return isFound;
		}
		,getChildJobEntityName: function(parentEntityName) {
			var ret;
			switch(parentEntityName.toLowerCase()) {
				case "campaign": ret = 'Project'; break;
				case "project": ret = 'Task'; break;
				case "task": ret = 'Subtask'; break;
			}
			return ret;
		}
		,sortColumn: function(sortObj,columnName,evt) {
			//console.log('firing sortColumn',sortObj,columnName,evt);
			var isNeg = false;
			var i = sortObj.column.indexOf(columnName);
			if (i == -1) {
				i = sortObj.column.indexOf('-'+columnName);
				if (i > -1) isNeg = true;
			}

			if (!evt.ctrlKey) {
				if (isNeg || i == -1) {
					sortObj.column = [columnName];
				} else {
					sortObj.column = ['-' + columnName];
				}
			} else {

				if (i > -1) {
					if (isNeg) {
						sortObj.column[i] = columnName;
					} else {
						sortObj.column[i] = '-'+columnName;
					}
				} else {
					sortObj.column.push(columnName);
				}

				// Commenting this out because it was throwint an error after migrating.
				// I think it has something to do with the job report list view
				// and resetting it when the ctrl key is not pressed
				// sortObj.revOrder = false;
			}
		}
		,getCookie: function(key) {
			var ret = '';
			var cookies = {};
			var cookieString = document.cookie.split('; ');
			for (var i=0; i < cookieString.length; i++) {
				var cookie = cookieString[i].split('=');
				cookies[cookie[0]] = decodeURI(cookie[1]);
			}

			if (key) {
				ret = eval(cookies[key]);
			} else {
				ret = cookies;
			}
			return ret;
		}
		,setCookie: function(key,val) {
			document.cookie = key + '=' + encodeURI(JSON.stringify(val)) + '; expires=Sun, 1 Jan 2017 12:00:00 GMT';
		}

		,editJob: function(job) {
			$rootScope.$broadcast('trigger:edit-job',{job:job});
		}
		,createJob: function(parentId,jobAttrs,cb) {
			jobAttrs = jobAttrs || {};
			cb = cb || angular.noop;
			$rootScope.$broadcast('trigger:create-new-job',{parentId:parentId,jobAttrs:jobAttrs,cb:cb});
		}
		,openWindowForJob: function (jobId) {
			$rootScope.$broadcast('trigger:open-job',{jobId:jobId});
		}
		,closeJobWindow: function(jobId) {
			$rootScope.$broadcast('trigger:destroy-window',{jobId:jobId});
		}
		,addStatusNoteToJob: function(jobId) {
			$rootScope.$broadcast('trigger:edit-status-note',{jobId:jobId});    //,cb:cb,ecb:ecb
		}
		,uploadFilesForJob: function(jobId) {
			$rootScope.$broadcast('trigger:upload-files',{jobId:jobId});
		}
		,addExpenseToJob: function(jobId) {
			$rootScope.$broadcast('trigger:edit-expense',{jobId:jobId});
		}

		,makeDate: function(offset) {
			var theDate = new Date();
			if (offset) {
				theDate = new Date(theDate.getTime() + (offset * 24 * 60 * 60 * 1000));
			}

			var day = theDate.getDate();
			var month = theDate.getMonth()+1; //January is 0!
			var yy = theDate.getFullYear().toString();
			if(day<10){
				day='0'+day
			}
			if(month<10){
				month='0'+month
			}

			return yy + '-' + month + '-' + day;
		}

		,isHtml: function(text) {
			return text.indexOf('<') != -1 && text.indexOf('>');
		}
	}
}]);
