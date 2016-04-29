var pfDirs = angular.module('PFunc.directives',['ngRoute','pfJobServices','pfActorServices','pfSecurityServices','pfUI','instanceDataModule']);


/**** KNOWN GOOD ****/
pfDirs.directive('ngRightClick',['$parse',function($parse) {
	return function(scope, element, attrs) {
		var fn = $parse(attrs.ngRightClick);
		element.bind('contextmenu', function(event) {
			scope.$apply(function() {
				event.preventDefault();
				fn(scope, {$event:event});
			});
		});
	};
}]);

pfDirs.directive('modalBackdrop',['$rootScope',function($rootScope) {
	return {
		restrict: 'A'
		,scope: true
		,controller: function($scope,$element) {
			$scope.show = function() {
				$element.removeClass('hide');
			};
			$scope.hide = function() {
				$element.addClass('hide');
			};
			$scope.closeModals = function() {
				$rootScope.$broadcast('trigger:close-all-modals');
				$scope.hide();
			};
			$scope.$on('trigger:show-modal-backdrop',function(event,args) {
				$scope.show();
			});
			$scope.$on('trigger:hide-modal-backdrop',function(event,args) {
				$scope.hide();
			});
		}
	}
}]);

pfDirs.directive('pfUserGroupSelector',['appConfig','pfUserService','pfGroupService','pfInstanceService',function (appConfig,pfUserService,pfGroupService,pfInstanceService) {
	return {
		templateUrl: 'partials/templates/user-selector.html',
		scope: {
			ngModel: '='
		},
		controller: function($scope,$element,appConfig,pfUserService,pfGroupService,pfInstanceService) {
			$scope.availUsers = pfUserService.activeUsers;
			$scope.availGroups = pfGroupService.activeGroups;

			$scope.selectedInstance = angular.copy(appConfig.instanceId);

			$scope.allInstances = pfInstanceService.allInstances;

			$scope.controllerName = "pfUserGroupSelector controller";

			//console.log("in " + $scope.controllerName + ", ngModel is ",$scope.ngModel);

			$scope.selectUsers = function() {
				if (!$scope.ngModel || typeof $scope.ngModel == 'undefined') $scope.ngModel = [];

				angular.forEach($scope.selectedGroupUsers, function(u) {
					if(u.sys_entityname === 'secGroup') {
						pfGroupService.getGroupById(u.id,function(data) {
							angular.forEach(data.actors, function(actor) {
								if (actor.sys_active) {
									if(!_.filter($scope.ngModel, function(sj) { return sj.id === actor.id;}).length)
										$scope.ngModel.push(actor);
								}
							});
						});
					} else {
						$scope.ngModel.push(u)
					}

				});

				$scope.selectedGroupUsers = [];
			};

			$scope.deselectUsers = function() {
				angular.forEach($scope.selectedRemoveUsers, function(u) {
					$scope.ngModel.splice($scope.ngModel.indexOf(u),1);
				});
				$scope.selectedRemoveUsers = [];
			};

			$scope.$on('trigger:reset-user-selector',function(event,args) {
				//console.log('firing reset');
				$scope.availableUserFilter = '';
			})
		}
		/*,link: function(scope,element,attrs) {

		}*/
	}
}]);

pfDirs.directive('lineageList',['pfJobService','pfUserService','pfUtils','pfRightsService','appConfig',function(pfJobService,pfUserService,pfUtils,pfRightsService,appConfig) {
	var template = '<ul class="list-lineage">' +
			'<li class="ancestor noFake color-campaign" ng-hide="!pfJob.parents.campaign.id.length || pfJob.id == pfJob.parents.campaign.id" ng-click="openWindowForJob(pfJob.parents.campaign)" ng-right-click="switchJobWin(jobId,pfJob.parents.campaign)" ng-class="{disabled:!canOpen(pfJob.parents.campaign),closed:!pfJob.parents.campaign.active}">{{pfJob.parents.campaign.instancePrefix}}-{{pfJob.parents.campaign.jobid}} - {{pfJob.parents.campaign.name}} <span class="text-error" ng-show="!pfJob.parents.campaign.active">[CLOSED]</span></span></li>' +
			'<li class="ancestor noFake color-project" ng-hide="!pfJob.parents.project.id.length || pfJob.id == pfJob.parents.project.id" ng-click="openWindowForJob(pfJob.parents.project)" ng-right-click="switchJobWin(jobId,pfJob.parents.project)" ng-class="{disabled:!canOpen(pfJob.parents.project),closed:!pfJob.parents.project.active}">{{pfJob.parents.project.instancePrefix}}-{{pfJob.parents.project.jobid}} - {{pfJob.parents.project.name}} <span class="text-error" ng-show="!pfJob.parents.project.active">[CLOSED]</span></li>' +
			'<li class="ancestor noFake color-task" ng-hide="!pfJob.parents.task.id.length || pfJob.id == pfJob.parents.task.id" ng-click="openWindowForJob(pfJob.parents.task)" ng-right-click="switchJobWin(jobId,pfJob.parents.task)" ng-class="{disabled:!canOpen(pfJob.parents.task),closed:!pfJob.parents.task.active}">{{pfJob.parents.task.instancePrefix}}-{{pfJob.parents.task.jobid}} - {{pfJob.parents.task.name}} <span class="text-error" ng-show="!pfJob.parents.task.active">[CLOSED]</span></li>' +
			'<li class="ancestor noFake color-subtask" ng-hide="!pfJob.parents.subtask.id.length || pfJob.id == pfJob.parents.subtask.id" ng-click="openWindowForJob(pfJob.parents.subtask)" ng-right-click="switchJobWin(jobId,pfJob.parents.subtask)" ng-class="{disabled:!canOpen(pfJob.parents.subtask),closed:!pfJob.parents.subtask.active}">{{pfJob.parents.subtask.instancePrefix}}-{{pfJob.parents.subtask.jobid}} - {{pfJob.parents.subtask.name}} <span class="text-error" ng-show="!pfJob.parents.subtask.active">[CLOSED]</span></li>' +
		'</ul>';

	return {
		restrict: 'EA'
		,template: template
		,scope: true
		,controller: function($scope,$element) {
			//console.log('appConfig in lineageList',appConfig);

			$scope.canOpen = function(job) {


				var canOpen = false;

				if (pfRightsService.userHasRole('globalAdmin')) return true;

				if (job) {
					var accessByInstance = !pfRightsService.userHasRole('vendor') && (appConfig.instanceId == job.instanceId || appConfig.sharedInstances.indexOf(job.instanceId) != -1)

					if (accessByInstance) {
						canOpen = true;
					} else {
						var pfJob = pfJobService.confirmJobStub(job.id);
						if (pfJob.$getJobTeam({returnType:'idList'}).indexOf(pfUserService.currentUser.id) != -1) {
							canOpen = true;
						}
					}
				}

				return canOpen;

			};

			$scope.openWindowForJob = function(jobObj) {
				//console.log('jobObj',jobObj);
				//if ($scope.canOpen(jobObj)) {
					pfUtils.openWindowForJob(jobObj.id);
				//}
			};

			$scope.switchJobWin = function(origId,jobObj) {
				//if ($scope.canOpen(jobObj)) {
					$scope.$emit('trigger:destroy-window',{jobId:origId});
					$scope.openWindowForJob(jobObj);
				//}
			};

			$scope.$on('trigger:update-job-lineage',function(evt,args) {
				if (args.jobId == $scope.jobId && !$scope.pfJob.loadingLineage) {
					//console.log('loading lineage from trigger in lineageList directive for jobId %o',$scope.jobId);
					$scope.pfJob.$loadLineage();
				}
			})
		}
		,link: function(scope,element,attrs) {
			scope.jobId = attrs.jobId || '';
			scope.pfJob = pfJobService.confirmJobStub(scope.jobId);

			/*scope.updateLineageList = function() {
				scope.pfJob.$loadLineage(function(data) {
					//console.log('data from getLineage',data);
					scope.lineage = data;
					var linText = '';
					if (data.campaign) {
						linText += data.campaign.name;
						if (data.campaign.id == scope.jobId) {
							delete data.campaign;
						}
					}
					if (data.project) {
						linText += '/' + data.project.name;
						if (data.project.id == scope.jobId) {
							delete data.project;
						}
					}
					if (data.task) {
						linText += '/' + data.task.name;
						if (data.task.id == scope.jobId) {
							delete data.task;
						}
					}
					if (data.subtask) {
						linText += '/' + data.subtask.name;
						if (data.subtask.id == scope.jobId) {
							delete data.subtask;
						}
					}
					if (scope.job) scope.job.linText = linText;
					//pfJobService.confirmJobStub(scope.jobId).parents = data;
					//$compile(template)(scope).appendTo(element);

				},genericError);
			};

			scope.updateLineageList();*/
		}
	}
}]);

pfDirs.controller('pfNavBarController',['$scope','$element','$route','$rootScope','pfUserService','pfRightsService',function($scope,$element,$route,$rootScope,pfUserService,pfRightsService) {
	$scope.loggedInUser = pfUserService.getUserInfo(pfUserService.currentUser.id);

	$scope.searchSettings = {
		includeClosed: false
	};

	$scope.hasRole = function(role) {
		return pfRightsService.userHasAnyRole(role);
	};

	$scope.navClass = function(page1) {
		// This function highlights the active item in the nav bar.
		if($route.current)
		//console.log($route.current);
			var header = $route.current.$$route.selectedHeader || '';

		return {
			active:page1 === header
		};
	};

	$scope.globalSearchRefresh = function () {
		$("#globalSearch").autocomplete("search", $scope.searchModel);
	};

	$scope.globalSearch2 = function () {
		var req;
		return {
			source: function (request, response) {
				//"remote2/JobFacade.cfc?method=searchJobs"

				// include closed jobs, otherwise just active
				var active = $scope.searchSettings.includeClosed ? 'all' : '1';

				if(req)
					req.abort();
				req = $.ajax(
					"http://192.168.1.5:83/remote2/JobFacade.cfc?method=searchJobs",
					{
						cache:false,
						data:{
							str:request.term,
							active: active
						}
					}
				)
					.success(
					function(data) {
						data = angular.fromJson(data);
						// console.log('response:', data)
						angular.forEach(data, function (item, idx) {
							item.value = item.id;
							item.label = item.type + ' ' + item.jobId + ': ' + item.name;
							//item.sys_active = item.sys_active === 1 ? true : false;
						});
						response(data);
					}
				);
			},
			minLength: 1,
			focus: function( event, ui ) {
				$( this ).val( ui.item.label );
				return false;
			},
			select: function( event, ui ) {
				$rootScope.$broadcast('trigger:open-job', {jobId: ui.item.id});
				$( this).val('');

				return false;
			}
		}
	};

	$scope.logout = function() {
		$rootScope.$broadcast('event:system-logout',{});
		window.location = '/?logout=true';
	};

}]);
pfDirs.directive('pfNavBar',[function() {
	return {
		restrict: 'E'
		,scope: false
		,templateUrl: '/partials/nav/navbar.html'
		,controller: 'pfNavBarController'
	}
}]);

pfDirs.controller('pfExpenseActivityController',['$scope','$element','$rootScope','pfUserService','pfUIService','pfFirebaseData','AmountService','ExpenseService','pfInstanceService',function($scope,$element,$rootScope,pfUserService,pfUIService,pfFirebaseData,AmountService,ExpenseService,pfInstanceService) {

	$scope.loadFeed = function() {
		//console.log('expId',$scope.expenseId);
		if ($scope.expenseId) {
			$scope.activityFeed = pfFirebaseData.getExpenseActivity($scope.expenseId);
		} else {
			$scope.activityFeed = pfFirebaseData.getExpenseActivity();
		}
	};


	AmountService.listFYs(function(data) {
		$scope.fiscalYears = data;
	},genericError);

	ExpenseService.getExpenseTypes(function(data) {
		$scope.expenseTypes = data;
	},genericError);

	$scope.getUserInfo = function(userId) {
		return pfUserService.getUserInfo(userId);
	};
	$scope.getActionName = function(action) {
		var ret = '';
		switch(action) {
			case "expenseCreated": ret = "Created"; break;
			case "expenseUpdated": ret = "Updated"; break;
			case "expenseArchived": ret = "Archived"; break;
			case "expenseRestored": ret = "Restored"; break;
			case "expenseDeducted": ret = "Deducted Actual"; break;

			case "adjustParentEstimate": ret = "Adjusted Parent Estimate"; break;

			case "expense-createCodeSegment": ret = "Admin Created Code Segment"; break;
			case "expense-updateCodeSegment": ret = "Admin Updated Code Segment"; break;
			case "expense-archiveCodeSegment": ret = "Admin Archived Code Segment"; break;
			case "expense-restoreCodeSegment": ret = "Admin Restored Code Segment"; break;

			case "expense-createVendor": ret = "Admin Created Vendor"; break;
			case "expense-updateVendor": ret = "Admin Updated Vendor"; break;
			case "expense-addVendorToInstance": ret = "Admin Selected Vendor for Instance"; break;
			case "expense-removeVendorFromInstance": ret = "Admin Deselected Vendor for Instance"; break;
			case "expense-mergeVendor": ret = "Admin Merged Vendors"; break;


		}
		return ret;
	};
	$scope.getTimeStamp = function(timestamp) {
		return pfUIService.reformatDate(timestamp) + ' <br> ' + new Date(timestamp).toLocaleTimeString();
	};
	$scope.getFY = function(fyId) {
		if ($scope.fiscalYears) {
			return _.find($scope.fiscalYears,function(item) {
				return item.yearID === fyId;
			})
		} else {
			return {};
		}
	};
	$scope.getFieldName = function(field) {
		var ret = '';
		switch(field) {
			case "budgetCodeObject": 	ret = "Budget Code"; break;
			case "expenseObject": 		ret = "Parent Expense"; break;
			case "jobObject": 			ret = "Job"; break;
			case "type": 				ret = "Type"; break;
			case "fiscalYear": 			ret = "Fiscal Year"; break;
			case "vendorObject": 		ret = "Vendor"; break;
			case "expenseAmount": 		ret = "Amount"; break;
			case "expenseSOWNumber": 	ret = "SOW Number"; break;
			case "expenseNotes": 		ret = "Notes"; break;
			case "name": 				ret = "Name"; break;
			case "vendorName": 			ret = "Name"; break;
			case "vendorInstances": 	ret = "Instances"; break;
			case "expenseOriginalEstimate": ret = "Original Estimate"; break;
			case "expenseInvoiceNumber": ret = "Invoice Number"; break;
			case "segmentName":			ret = "Code Segment Name"; break;
			case "segmentValue":		ret = "Code Segment Value"; break;
			case "segmentType":			ret = "Code Segment Type"; break;
			case "segmentTypeName":		ret = "Code Segment Type"; break;
			/*case "type": 				ret = "Type"; break;
			 case "type": 				ret = "Type"; break;*/
			default: ret = field; break;
		}
		ret += ': ';
		return ret;
	};

	$scope.getInstanceList = function(idList) {
		if (!idList) return "None";

		var ret = [];
		for (var i=0; i < pfInstanceService.allInstances.length; i++) {
			if (idList.indexOf(pfInstanceService.allInstances[i].id) != -1) {
				ret.push(pfInstanceService.allInstances[i].prefix);
			}
		}
		//console.log(pfInstanceService.allInstances);
		return ret.join(', ');
	}
}]);
pfDirs.directive('pfExpenseActivityFeed',[function() {
	return {
		restrict: 'E'
		,scope: true
		,templateUrl: '/partials/templates/expenseActivity.html'
		,controller: 'pfExpenseActivityController'
		,link: function(scope,element,attrs) {
			if (attrs.expenseId) scope.expenseId = attrs.expenseId;
			//console.log('attrs',attrs)
			scope.loadFeed();
		}
	}
}]);

pfDirs.controller('pfJobSyncActivityController',['$scope','$element','$rootScope','pfUserService','pfStatusService','jobData','pfUIService','pfFirebaseData','$filter',function($scope,$element,$rootScope,pfUserService,pfStatusService,jobData,pfUIService,pfFirebaseData,$filter) {

	$scope.loadFeed = function() {
		$scope.suppressedTypes = [];
		$scope.typeFilter = function(item){ return $scope.suppressedTypes.indexOf(item.type) === -1 };
		//console.log('expId',$scope.expenseId);
		if ($scope.userId) {
			$scope.activityFeed = pfFirebaseData.getJobSync({userId:$scope.userId});

		} else if ($scope.jobId) {
			$scope.activityFeed = pfFirebaseData.getJobSync({jobId:$scope.jobId});
			$scope.suppressedTypes = ['windowOpened','windowClosed'];

		} else if ($scope.activityType) {
			$scope.activityFeed = pfFirebaseData.getJobSync({type:$scope.activityType});

		} else if ($scope.global) {
			$scope.activityFeed = pfFirebaseData.getJobSync({global:$scope.global});
			$scope.suppressedTypes = ['jobUpdated'];

		} else {
			//console.log('nothing',$scope.userId);
			$scope.activityFeed = pfFirebaseData.getJobSync();
		}
	};

	$scope.getStatusName = function(statusId) {
		return pfStatusService.getStatusById(statusId).name;
	};

	$scope.getUserInfo = function(userId) {
		return pfUserService.getUserInfo(userId);
	};

	$scope.getJobInfo = function(jobId,cb) {
		cb = cb || angular.noop;
		return jobData.loadSummary(jobId,function(data) { cb(data); });
	};

	$scope.showActivityItem = function(item) {
		if (item.show) {
			item.show = false;
		} else {
			//console.log('item',item);
			item.show = true;
			item.loadingData = true;

			if (['statusNoteAdded','statusNoteEdited','statusNoteRemoved','jobClosed','jobReopened','windowOpened','windowClosed','reassignParent'].indexOf(item.type) != -1) {
				/*console.log('get jobData for ',item.jobId);*/
				$scope.getJobInfo(item.jobId,function(data) {
					item.jobData = data;
					item.loadingData = false;
				});
			} else {
				item.loadingData = false;
			}

			if (['reassignParent'].indexOf(item.type) != -1) {
				/*item.newParentData = $scope.getJobInfo(item.newParentId);
				 item.oldParentData = $scope.getJobInfo(item.newParentId);*/
			}

			if (['reorderChildren'].indexOf(item.type) != -1) {
				console.warn('get child id data here');
				//var childJobArray = []

			}
		}

	};

	$scope.isKeyForDisplay = function(key) {
		var badKeys = ['show','$id','$priority','type'];
		return badKeys.indexOf(key) === -1;
	};

	$scope.getActionName = function(action) {
		//console.log('action',action);
		var ret = action;
		switch(action) {
			case "jobCreated": ret = "Created Job"; break;
			case "jobUpdated": ret = "Updated Job"; break;
			case "jobClosed": ret = "Closed Job"; break;
			case "jobReopened": ret = "Reopened Job"; break;
			case "reassignParent": ret = "Moved Job"; break;
			case "reorderChildren": ret = "Reordered Job Children"; break;
			case "statusNoteAdded": ret = "Added Status Note"; break;
			case "statusNoteEdited": ret = "Edited Status Note"; break;
			case "statusNoteRemoved": ret = "Deleted Status Note"; break;
			case "appLoaded": ret = "PFunc Opened"; break;
			case "appUnloaded": ret = "PFunc Closed"; break;
			case "windowOpened": ret = "Opened Job Window"; break;
			case "windowClosed": ret = "Closed Job Window"; break;
			case "newChecklist": ret = "Created New Checklist"; break;
			case "addChecklistItem": ret = "Created New Checklist Item"; break;
			case "updateChecklistItem": ret = "Updated Checklist Item"; break;
			case "deleteChecklistItem": ret = "Deleted Checklist Item"; break;
			case "checklistItemComplete": ret = "Marked Checklist Item Complete"; break;
			case "checklistItemIncomplete": ret = "Marked Checklist Item Incomplete"; break;
		}
		return ret;
	};

	$scope.getTimeStamp = function(timestamp) {
		return pfUIService.reformatDate(timestamp) + ' - ' + new Date(timestamp).toLocaleTimeString();
	};

	$scope.getFieldValue = function(field,value) {
		var ret = '';
		if (!value) {
			ret = "Not set";
		} else {
			switch(field) {
				case "ownerId":
					ret = pfUserService.getUserInfo(value).name;
					break;
				case "followerIds":
					var followerArray = [];
					for (var i=0; i < value.length; i++) {
						var userId = value[i];
						followerArray.push(pfUserService.getUserInfo(userId).name);
					}
					if (followerArray.length) {
						ret = followerArray.join(', ');
					} else {
						ret = 'No followers';
					}
					break;
				default:
					ret = value;
					if (!ret.length) ret = 'Not set';
					break;
			}
		}


		return ret;
	};

	$scope.getFieldName = function(field) {
		var ret = '';
		switch(field) {
			case "name": 				ret = "Name"; break;
			case "description": 		ret = "Description"; break;
			case "note": 				ret = "Note"; break;
			case "jobId": 				ret = "Job ID"; break;
			case "parentId": 			ret = "Parent Job ID"; break;
			case "jobInstanceId": 		ret = "Job Instance ID"; break;
			case "jobInstancePrefix": 	ret = "Job Instance Prefix"; break;
			case "jobType": 			ret = "Job Type"; break;
			case "ownerId": 			ret = "Owner"; break;
			case "followerIds": 		ret = "Followers"; break;
			case "dueDate": 			ret = "Due Date"; break;
			case "startDate": 			ret = "Start Date"; break;
			case "notificationSent": 	ret = "Notification was sent?"; break;
			case "$id": 				ret = "FireSync ID"; break;
			case "timestamp": 			ret = "Timestamp"; break;
			case "type": 				ret = "Action Type"; break;
			case "userId": 				ret = "ID of user who broadcasted the FireSync"; break;

			default: ret = field; break;
		}
		ret += ': ';
		return ret;
	};


}]);
pfDirs.directive('pfJobSyncActivityFeed',[function() {
	return {
		restrict: 'E'
		,scope: true
		,templateUrl: '/partials/templates/jobSyncActivity.html'
		,controller: 'pfJobSyncActivityController'
		,link: function(scope,element,attrs) {
			if (attrs.userId) scope.userId = attrs.userId;
			if (attrs.jobId) scope.jobId = attrs.jobId;
			if (attrs.activityType) scope.activityType = attrs.activityType;
			if (attrs.global) scope.global = attrs.global;
			scope.loadFeed();
		}
	}
}]);



pfDirs.controller('pfTaskBarController',['$scope','pfJobService','pfUtils',function($scope,pfJobService,pfUtils) {
	$scope.openWindowForJob = pfUtils.openWindowForJob;
	$scope.closeJobWindow = pfUtils.closeJobWindow;

	$scope.allPfJobs = pfJobService.allJobs;
}]);
pfDirs.directive('pfTaskBar',[function() {
	return {
		restrict: 'E'
		,scope: false
		,templateUrl: '/partials/nav/taskbar.html'
		,controller: 'pfTaskBarController'
	}
}]);

pfDirs.directive('tabs',['pfRightsService',function(pfRightsService) {
	return {
		restrict: 'E',
		transclude: true,
		//scope: {},
		controller: function($scope, $element) {
			//console.log('in directive tabs - controller');
			$scope.panes = [];

			$scope.$on('trigger:switch-pane', function(event,args) {
				var paneTitle = args.paneTitle;
				angular.forEach($scope.panes,function(pane) {
					if (pane.title.toLowerCase() == paneTitle.toLowerCase()) {
						$scope.select(pane);
					}
				})
			});

			$scope.select = function(pane) {
				//console.log('firing select with pane ',pane);
				angular.forEach($scope.panes, function(pane) {
					pane.selected = false;
				});
				pane.selected = true;
				if(pane.select) {
					$scope.$eval(pane.select);

				}

			};

			$scope.hidePane = function(pane) {
				if(pane.hide)
					return pane.hide();
			};

			this.addPane = function(pane) {
				pane.auth = pane.auth || '';
				$scope.$watch(function() {
					return pfRightsService.userHasRole(pane.auth);
				},function() {
					var showPane = pane.auth ? pfRightsService.userHasRole(pane.auth) : true;
					if (showPane) {
						if ($scope.panes.indexOf(pane) == -1) {
							$scope.panes.push(pane);
							if ($scope.panes.length == 1) $scope.select(pane);
						}
					}
				})
			}
		},
		template:
		'<div class="tabbable">' +
		'<ul class="nav nav-tabs">' +
		'<li ng-repeat="pane in panes track by $index" ng-class="{active:pane.selected}" ng-hide="hidePane(pane)">' +
		'<a href="" ng-click="select(pane)">{{pane.title}}</a>' +
		'</li>' +
		'</ul>' +
		'<div class="tab-content" ng-transclude></div>' +
		'</div>',
		replace: true
	};
}]);

pfDirs.directive('pane',[function() {
	return {
		require: '^tabs',
		restrict: 'E',
		transclude: true,
		scope: {
			title: '@',
			select: '&',
			auth: '&',
			hide: '&ngHide'
		},
		link: function(scope, element, attrs, tabsCtrl) {
			scope.auth = attrs.auth;
			tabsCtrl.addPane(scope);
		},
		template:
		'<div class="tab-pane" ng-class="{active: selected}" ng-transclude>' +
		'</div>',
		replace: true
	};
}]);

pfDirs.directive('leadZeros',[function() {
	return {
		require: 'ngModel',
		link: function(scope, elm, attrs, ctrl) {

			elm.blur(function() {
				var val = ctrl.$viewValue || '';
				val = val.toString();
				ctrl.$setViewValue(val);
				ctrl.$render();
			});
		}

	}
}]);

pfDirs.directive('columnSortArrows',[function() {
		return {
			restrict: 'E'
			,scope: {
				column: '='
				,value: '@'
			}
			,template: '<div class="pull-right columnSortArrows">' +
			'<i class="fa fa-fw fa-sort" ng-show="isNotSorted()"></i>' +
			'<i class="fa fa-fw fa-sort-asc" ng-show="isSortedAsc()"></i>' +
			'<i class="fa fa-fw fa-sort-desc" ng-show="isSortedDesc()"></i>' +
			'</div>'
			,controller: function($scope,$element) {
				$scope.ascExists = function() {
					return $scope.column.indexOf($scope.value) != -1;
				};
				$scope.descExists = function() {
					return $scope.column.indexOf('-' + $scope.value) != -1;
				};

				$scope.isNotSorted = function() {
					return !($scope.ascExists() || $scope.descExists());
				};
				$scope.isSortedAsc = function() {
					return !$scope.isNotSorted() && $scope.ascExists();
				};
				$scope.isSortedDesc = function() {
					return !$scope.isNotSorted() && $scope.descExists();
				};
			}
		}
	}]);

pfDirs.directive('nowrap',[function() {
	return {
		restrict: 'E'
		,transclude: true
		,template: '<span class="nowrap"><ng-transclude></ng-transclude></span>'
	}
}]);

/**** CONFIRMED IN USE ****/



// 1/11/14: daden: Generalized modal window directive
/*pfunc.directive.pfModal = function ($compile, $http, $templateCache, $parse, $timeout) {
	console.log('in pfunc.directive.pfModal')
	var fetchedTemplate, parentElement;
	return {
		restrict: 'A',
		scope: {},
		compile: function( tElement, tAttrs ) {
			// get the template
			var partial = tAttrs["pfModalPartial"],
				prom = $http.get(partial, {cache:$templateCache});

			// put the template into a var that will be available in the 'link' method.
			prom.then( function(data) {
				fetchedTemplate = data.data;
			})

			// add an element to contain the dialog elements
			tElement.after('<span class="pfModalContainer"></span>');
			// get the parentElement -- will need it to get the enclosing scope
			parentElement = tElement.parent();

			// return the link function
			return modalLink;
		}
	}

	function modalLink(scope, element, attrs) {

			// get the enclosing scope
			var enclosingScope = parentElement.scope();

			// get attributes
			var cleanUpFunc = attrs["pfModalCleanUp"] || angular.noop,              // function for cleaning up
				modalFunc = $parse(attrs["pfModalFunc"])(enclosingScope) || angular.noop;     // method to run on the info passed in

			// get the dialog Container
			var dialogContainer = element.next("span.pfModalContainer");
		
			// method to open the dialog
			scope.openModal = function( param ) {

				// If we passed in a method to process the data passed in, run it.
				param = $parse(param)(enclosingScope);          // need to evaluate the parameter string against the enclosingScope
				modalFunc( param );                  // if we passed in a function, run it with the param evaluated in the enclosingScope

				// create an element for the dialog inside the dialogContainer (it will be moved when 'dialog()' is invoked)
				// var modalDialog = dialogContainer.append('<span class="pfModalDialog"></span>').find("span.pfModalDialog");
				var modalDialog = dialogContainer.append('<span class="pfModalDialog"></span>');

				// compile the template against the enclosingScope and add it to the dialog
				modalDialog.html( $compile(fetchedTemplate)(enclosingScope) );

				// open the dialog
				modalDialog.dialog({
					autoOpen: true,
					title: 'Create a new ',
					height: 800,
					width: 600,
					modal: true,
					buttons: {
						Close: function() {
							modalDialog.dialog("destroy");
							modalDialog.remove();
						}
					},
					close: function() {
						modalDialog.dialog("destroy");
						modalDialog.remove();
					}
				});

				// Run the cleanup method if passed in
				modalDialog.on('$destroy', function() {
					cleanUpFunc();
				})
			}
	}
};*/


