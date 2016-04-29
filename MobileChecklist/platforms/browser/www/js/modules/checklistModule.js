var checklistModule = angular.module('ChecklistModule',['firebase','PFuncFirebase','ngResource','pfUI','PFunc.directives','PFunc.filters','pfActorServices','pfSecurityServices','artemdemo.popup','pfJobServices','instanceDataModule','ui.tree']); //,'ui'

checklistModule.run(['$rootScope','$http','pfUserService','pfRightsService','pfInstanceService',function($rootScope,$http,pfUserService,pfRightsService,pfInstanceService) {
	$http.defaults.headers.common['Client-Application'] = 'mobileApp';
	$http.defaults.headers.common['Authorization'] = 'jorvis';
	//$http.defaults.useXDomain = true;

	if (!pfUserService.currentUser.id) {
		//console.log('user not loaded');
		var rolesLoaded = false;
		var instanceLoaded = false;

		pfUserService.getCurrentUser(function(data) {
			pfRightsService.setRoles(function() {
				rolesLoaded = true;
				if (rolesLoaded && instanceLoaded) $rootScope.appLoaded = true;
			});

			pfInstanceService.setupInstance(data.instanceId,function() {
				instanceLoaded = true;
				if (rolesLoaded && instanceLoaded) $rootScope.appLoaded = true;
			});
		});
	} else {
		//console.log('user loaded');
	}
}]);

checklistModule.factory('MyChecklists',['$firebaseArray','$firebaseObject','pfUserService',function($firebaseArray,$firebaseObject,pfUserService) {
	var fba = $firebaseArray.$extend({
		$$defaults: {
			color: 'ffffff'
			,textColor: '000000'
			,archived: false
		}
	});
	return function(type) {
		if (!type) {
			return new fba(firebaseRef.child('checklist-rights').child(pfUserService.currentUser.id).child('ownedLists'), firebaseRef.child('checklist-rights').child(pfUserService.currentUser.id).child('sharedLists'));
		} else {
			console.log(type)
			console.log(pfUserService.currentUser.id);
			switch(type) {
				case 'owned':
					return new fba(firebaseRef.child('checklist-rights').child(pfUserService.currentUser.id).child('ownedLists'));
					break;
				case 'shared':
					return new fba(firebaseRef.child('checklist-rights').child(pfUserService.currentUser.id).child('sharedLists'));
					break;
				default:
					return new $firebaseObject(firebaseRef.child('checklist-rights').child(pfUserService.currentUser.id).child('ownedLists').child(type), firebaseRef.child('checklist-rights').child(pfUserService.currentUser.id).child('sharedLists').child(type));
					break;
			}
		}

	}
}]);
checklistModule.factory('ShareChecklist',['$firebaseObject',function($firebaseObject) {
	return function(userId,listId) {
		return new $firebaseObject(firebaseRef.child('checklist-rights').child(userId).child('sharedLists').child(listId));
	}
}]);


checklistModule.factory('Checklist',['$firebaseObject',function($firebaseObject) {
	var obj = $firebaseObject
	/*.$extend({
		placeholder: function(input) {
			console.log('placeholder',input);
			return "You said " + input;
		}
		,foo: 'bar'
	})*/;
	return function(listId) {
		return new obj(firebaseRef.child('checklists').child(listId));
	}
}]);
checklistModule.factory('ChecklistItems',['$firebaseArray',function($firebaseArray) {
	var arr = $firebaseArray;
	return function(listId,type) {
		if (type && type == 'inactive') {
			return new arr(firebaseRef.child('checklists').child(listId).child('inactiveItems'));
		} else {
			return new arr(firebaseRef.child('checklists').child(listId).child('items'));
		}

	}
}]);
checklistModule.factory('ChecklistSubitems',['$firebaseArray',function($firebaseArray) {
	return function(path) {
		if (path) {
			path = path.replace(/\//g, '/items/') + '/items';
			return new $firebaseArray(firebaseRef.child('checklists').child(path));
		}
	}
}]);
checklistModule.factory('ChecklistItem',['$firebaseObject',function($firebaseObject) {
	return function(path) {
		if (path) {
			path = path.replace(/\//g, '/items/');
			return new $firebaseObject(firebaseRef.child('checklists').child(path));
		}
	}
}]);
checklistModule.factory('ChecklistUsers',['$firebaseObject',function($firebaseObject) {
	return function(listId,type) {
		if (type) {
			return new $firebaseObject(firebaseRef.child('checklists').child(listId).child('shareUsers').orderByValue().equalTo(type));
		} else {
			return new $firebaseObject(firebaseRef.child('checklists').child(listId).child('shareUsers'));
		}
	}
}]);

checklistModule.factory('ChecklistShareOptions',['$firebaseArray',function($firebaseArray) {
	return new $firebaseArray(firebaseRef.child('checklist-share-options'));
}]);





checklistModule.controller('checklistContainerController',['$scope','$element','$popup','pfFirebaseAuthService','pfFirebaseData','pfUserService','MyChecklists','Checklist','ChecklistItem','ChecklistShareOptions','pfFireSyncService',function($scope,$element,$popup,pfFirebaseAuthService,pfFirebaseData,pfUserService,MyChecklists,Checklist,ChecklistItem,ChecklistShareOptions,pfFireSyncService) {
	$scope.controllerName = 'checklistContainerController';

	$scope.firebaseConnected = false;
	$scope.checklists = [];

	$scope.checklistContainerSettings = {
		cornerToggle: 'newForm'
		,sortableEnabled: true
		,filter: {}
	};
	$scope.userPrefs = {
		checklistSortingEnabled: true
	};
	$scope.setCornerToggle = function(val) {
		$scope.checklistContainerSettings.cornerToggle = val;
	};
	$scope.isCornerToggle = function(val) {
		return $scope.checklistContainerSettings.cornerToggle == val;
	};


	/*$scope.toggleSortable = function() {
		$scope.checklistContainerSettings.sortableEnabled = !$scope.checklistContainerSettings.sortableEnabled;
	};*/

	pfFirebaseAuthService.onAuth(function(authData) {
		console.log('connected to firebase');
		$scope.firebaseConnected = true;
		if (authData) {
			$scope.init();
		}
	},function() {
		$scope.firebaseConnected = false;
	});

	$scope.$watch(function() {
		return $scope.userPrefs.checklistSortingEnabled;
	},function(newVal,oldVal) {
		//console.log('old is %o and new is %o',oldVal,newVal);

		var checklistContainers = $element.find('.container-list-checklists');
		var items = checklistContainers.children('li');

		if ($scope.userPrefs.checklistSortingEnabled) {
			$('.ui-sortable').sortable('enable');
			/*angular.forEach(items,function(item) {
				$(item).removeClass('sortable-false');
			});*/
		} else {
			$('.ui-sortable').sortable('disable');
			/*angular.forEach(items,function(item) {
				$(item).addClass('sortable-false');
			});*/
		}
	});

	$scope.init = function() {
		$scope.resetNewChecklistData();
		$scope.loadMyChecklists();

		pfFirebaseData.getUserPrefs().$bindTo($scope,'userPrefs');

		$scope.shareOptions = ChecklistShareOptions;

	};

	$scope.loadMyChecklists = function() {
		//$scope.myChecklists = MyChecklists();
		$scope.loadingOwned = true;
		$scope.loadingShared = true;
		MyChecklists('owned').$loaded().then(function(data) {
			$scope.myOwnedLists = data;
			$scope.loadingOwned = false;
		});
		MyChecklists('shared').$loaded().then(function(data) {
			$scope.mySharedLists = data;
			$scope.loadingShared = false;
		});

	};

	$scope.addNewChecklist = function() {
		if ($scope.newChecklist.name.length) {
			$scope.newChecklist.dateCreated = new Date().getTime();

			// Create a list item with just two properties, then overwrite it with the values from $scope.newChecklist

			var newListData = {
				color: 'ffffff'
				,rights: 'owned'
			};

			$scope.myOwnedLists.$ref().transaction(function() {
				$scope.myOwnedLists.$add(newListData).then(function(ref) {
					//console.info('FireSync: ',newListData,$scope.newChecklist);
					pfFireSyncService.announce({
						mobile: $scope.mobile
						,type: 'newChecklist'
						,data: $scope.newChecklist
					});
					var cl = Checklist(ref.key());
					for (var key in $scope.newChecklist) {
						cl[key] = $scope.newChecklist[key];
					}
					cl.$save().then(function(ref) {
						$scope.resetNewChecklistData();
					});

				});
			});
		}
	};

	$scope.updateMyOwnedChecklistOrder = function(idOrder,ui) {
		//console.log('update My Owned checklist order',idOrder,ui);
		$scope.updateChecklistOrder(idOrder,'ownedChecklist-','myOwnedLists');
	};
	$scope.updateMySharedChecklistOrder = function(idOrder,ui) {
		//console.log('update My Shared checklist order',idOrder,ui);
		$scope.updateChecklistOrder(idOrder,'sharedChecklist-','mySharedLists');
	};
	$scope.updateChecklistOrder = function(idOrder,prefix,listSet) {
		console.log('firing updateChecklistOrder');
		if (idOrder.indexOf('') != -1) idOrder.splice(idOrder.indexOf(''),1);

		//console.log('idOrder',idOrder);

		for (var i=0; i < idOrder.length; i++) {
			var oldPos = idOrder[i].replace(prefix,'');
			var list = $scope[listSet][oldPos];
			//console.log('listSet',$scope[listSet]);
			//console.log('oldPos,listSet,list',oldPos,listSet,list);
			list.$priority = i;
			$scope[listSet].$save(list).then(function(ref) {
				// Do nothing
			}).catch(genericError);
		}
	};

	$scope.resetNewChecklistData = function() {
		$scope.newChecklist = {
			createdBy: pfUserService.currentUser.id
			,archived: false
		};
	};

	$scope.$on('checklist:removeSubitem',function(evt,args) {
		if (args.itemPath) {
			var item = ChecklistItem(args.itemPath);
			item.$remove().then(function(data) {
				//console.info('remove success',data);
			},function(error) {
				$popup.show({
					title: 'Oops...'
					,template: 'An error occurred removing the item from it&quot;s parent list (' + args.itemPath + ').  The error message was: ' + error
				})
			})
		}

		/*if ($scope.item.items) {
			var foundItem = _.find($scope.item.items,function(item) {
				return item.$id == args.itemId;
			});
			if (foundItem) {
				console.info('firing remove subitem',args);
				var parentList = _getItemList();
				parentList.$remove(foundItem).then(function(data) {
					console.info('Remove succeeded',data);
				},function(error) {
					console.info('Remove failed',error);
				})
			} else {
				console.info('%o not found',args.itemId,args)
			}
		}*/

	})

}]);
checklistModule.directive('checklistContainer',[function() {
	return {
		restrict: 'A'
		,scope: true
		,templateUrl: 'partials/templates/checklistContainer.html'
		,controller: 'checklistContainerController'
		,link: function(scope,element,attrs) {
			scope.mobile = attrs.mobile || false;
		}
	}
}]);

checklistModule.controller('checklistController',['$scope','$element','$timeout','$rootScope','$popup','ChecklistItems','Checklist','ChecklistSubitems','ShareChecklist','ChecklistUsers','checklistService','pfUIService','pfUserService','pfUtils','pfFireSyncService',function($scope,$element,$timeout,$rootScope,$popup,ChecklistItems,Checklist,ChecklistSubitems,ShareChecklist,ChecklistUsers,checklistService,pfUIService,pfUserService,pfUtils,pfFireSyncService) {
	$scope.controllerName = 'checklistController';
	//console.log('starting checklistController for ',$scope.checklist.$id);

	$scope.createJob = pfUtils.createJob;

	/*  Get the ID, rights and personalized checklist info from the parent scope  */
	$scope.checklistId = $scope.cl.$id;
	$scope.checklistRights = $scope.cl.rights;
	$scope.checklistColor = $scope.cl.color || 'white';
	$scope.checklistTextColor = $scope.cl.textColor || 'black';
	$scope.listUsers = {};

	/*  Load up the Checklist itself.  We're grabbing some other Arrays as well  */
	Checklist($scope.checklistId).$loaded().then(function(data) {
		$scope.checklist = data;
		//console.log('data from checklist',data);
		$scope.editData = {
			name: data.name
			,desc: data.desc
			,editMode: false
			,showCPinput: false
		}
	});

	$scope.loadTopItems = function() {
		$scope.clItems = ChecklistItems($scope.checklistId);
	};
	//$scope.inactiveClItems = ChecklistItems($scope.checklistId,'inactive');
	$scope.clShares = ChecklistUsers($scope.checklistId);


	/*  UI helpers  */
	$scope.getRightsIcon = function() {
		var icon = '';
		var text = '';
		if ($scope.listIsOwned()) {
			icon = 'fa-key';
			text = 'You own this list';
		} else if ($scope.canListManage()) {
			icon = 'fa-cogs';
			text = 'You can manage this list';
		} else if ($scope.canListMark()) {
			icon = 'fa-check-square-o';
			text = 'You can cross items off this list';
		} else if ($scope.listReadOnly()) {
			icon = 'fa-lock';
			text = 'This list is read-only';
		}
		return '<span class="label label-info"><i class="fa fa-fw ' + icon + '"></i> ' + text + '</span>';
	};
	$scope.getStatusIndicator = function(dueDate) {
		return pfUIService.getStatusIndicator(dueDate);
	};
	$scope.getBackgroundColor = function(color) {
		return pfUIService.getBackgroundColorCSS($scope.checklistColor,color);
	};
	$scope.getTextColor = function(color) {
		return pfUIService.getTextColorCSS($scope.checklistTextColor,color);
	};
	$scope.isListShared = function() {
		for (var key in $scope.clShares) {
			if (key.substring(0,1) != '$' && $scope.clShares.hasOwnProperty(key)) return true;
		}
		return false;
		/*var foo = Object.keys($scope.clShares);
		 console.log('keys',foo);*/
	};

	$scope.getUserInfo = function(userId) {
		return pfUserService.getUserInfo(userId);
	};


	/*  Settings for each checklist - refers to functions in UI helpers section, so must be declared after it  */
	$scope.checklistSettings = {
		showInactiveItems: false
		,showListDetails: false
		,showShareControls: false
		,showQuickEntry: true
		,bgColor: $scope.getBackgroundColor
		,textColor: $scope.getTextColor
	};
	$scope.checklistSettingToggle = function(settingName) {
		$scope.checklistSettings[settingName] = !$scope.checklistSettings[settingName];
	};


	/*  Form for new Checklist Items*/
	$scope.resetNewChecklistItemData = function() {
		$scope.newChecklistItem = {
			completed: false
		};
	};
	$scope.resetNewChecklistItemData();

	$scope.openPrintableChecklist = function(checklistId) {
		//console.log('print %o',checklistId);
		window.open('/printChecklist.cfm?checklistId='+checklistId,'_blank');
	};

	/*  List rights */
	$scope.hasListRight = function(right) {
		//console.log('hasRight',right,$scope.cl.rights === right,$scope.cl);
		return $scope.cl.rights === right;
	};
	$scope.listIsOwned = function() {
		return $scope.hasListRight('owned');
	};
	$scope.canListManage = function() {
		return ($scope.listIsOwned() || $scope.hasListRight('manage'));
	};
	$scope.canListMark = function() {
		return ($scope.listIsOwned() || $scope.hasListRight('manage') || $scope.hasListRight('mark'));
	};
	$scope.listReadOnly = function() {
		return $scope.hasListRight('viewOnly');
	};

	$scope.clearHeight = function() {
		$scope.checklist.height = '';
		$scope.saveChecklistData();
	};
	$scope.clearWidth = function() {
		$scope.checklist.width = '';
		$scope.saveChecklistData();
	};
	$scope.onResizeHeightStop = function(event,ui) {
		$scope.checklist.height = ui.size.height;
		$scope.saveChecklistData();
	};

	$scope.onResizeWidthStop = function(event,ui) {
		$scope.checklist.width = ui.size.width;
		$scope.saveChecklistData();
	};

	function _saveAllListItems(list) {
		for (var i=0; i < list.length; i++) {
			list[i].$priority = i+1;
			list.$save(list[i]);
		}
		//console.log('saved all list items',list)
	}

	$scope.treeOptions = {
		accept: function(sourceNodeScope, destNodesScope, destIndex) {
			//console.info('in accept',sourceNodeScope,destNodesScope,destIndex);
			//console.log('in accept, destNodesScope.depth() is %o and parentJobType is %o',destNodesScope.depth(),$scope.conversionData.parentJobType);

			var accepted = true;
			/*var depth = destNodesScope.depth();

			switch($scope.conversionData.parentJobType.toLowerCase()) {
				case "campaign": if (depth >= 3) accepted = false; break;
				case "project": if (depth >= 2) accepted = false; break;
				case "task": if (depth >= 1) accepted = false; break;
			}*/

			return accepted;
		}
		,beforeDrag: function(sourceNodeScope) {
			// Check if the current selected node can be dragged.

			return $scope.canListManage();  // false to disallow drag
		}
		,removed: function(node) {
			// If a node is removed, the removed callback will be called.
		}
		,dragStart: function(event) {
			/*console.info('drag start');
			 console.log(event);*/
			/*$scope.dragElement = event.elements.dragging;
			 $scope.placeholderElement = event.elements.placeholder;*/
		}
		,dragMove: function(event) { }
		,dragStop: function(event) {
			/*console.info('drag stop');
			 console.log(event);*/

			/*$scope.dragElement.removeClass('angular-ui-tree-drag-invalid');*/
			//$scope.placeholderElement.removeClass('campaign').removeClass('project').removeClass('task').removeClass('subtask');
			//$scope.placeholderElement.text('');
			//TODO: reset placeholder and drag elements here
		}
		,beforeDrop: function(event) { }
		,dropped: function(event) {
			//console.warn('firing dropped',event);

			var listItem = event.source.nodeScope.$modelValue;
			var itemPath = event.source.nodeScope.checklistItemPath;
			var srcList = event.source.nodesScope.$modelValue;
			var destList = event.dest.nodesScope.$modelValue;

			if (srcList != destList) {
				//console.warn('switch lists!');

				$scope.$emit('checklist:removeSubitem',{itemId:listItem.$id,itemPath:itemPath});

				_saveAllListItems(destList);

				try {
					//console.log('reload subitems');
					event.source.nodesScope.$parent.loadSubitems();
				} catch(e) {
					//console.warn('reload top items');
					$scope.loadTopItems();
				}


			} else {
				//console.log('List was not changed');
				if (event.source.index == event.dest.index) {
					//console.log('Item was not repositioned');
				} else {
					//console.warn('reindex list!');
					_saveAllListItems(srcList);
				}
			}

		}
	};


	/*  Reordering Checklists and moving items between Checklists */
	/*$scope.updateChecklistItemOrder = function(idOrder,ui) {
		if (!($scope.listIsOwned() || $scope.canListManage())) {
			//console.log('Blocking move of checklist items - user not authorized');
		} else {
			$scope.saveChecklistItemOrder(idOrder);
		}

	};
	$scope.saveChecklistItemOrder = function(itemOrder) {
		if (itemOrder.indexOf('') != -1) itemOrder.splice(itemOrder.indexOf(''),1);

		if (itemOrder.length == $scope.clItems.length) {

			for (var i=0; i < itemOrder.length; i++) {
				var itemId = itemOrder[i].replace('clItem-','');
				var clItem = $scope.clItems.$getRecord(itemId);
				clItem.$priority = i;
				//console.log('item %o was at pos %o and is now at %o',clItem.name,itemId,i);
				$scope.clItems.$save(clItem);
			}
		} else {
			//console.log('items were added or removed.  Cancelling saveChecklistItemOrder');
		}

	};
	$scope.receiveChecklistItem = function(event,ui,idOrder) {
		if (idOrder.indexOf('') != -1) idOrder.splice(idOrder.indexOf(''),1);

		// Start out by getting the list that send the item by digging deep into the ui variable that's sent and retrieve the $scope data from it
		ChecklistItems(ui.sender.data().$scope.$parent.checklistId).$loaded(function(senderList) {

			// Get a genuine reference to the original item being moved (instead of relying on what came through the ui variable, in case it's a copy or whatnot)
			var moveItem = senderList.$getRecord(ui.item.data().$scope.item.$id);

			// To make sure we're not confuddling Firebase with duplicate keys, make a copy to insert into the receiving list and wipe out it's key.
			var newItem = angular.copy(moveItem);
			delete newItem.$id;

			// Loop over the idOrder for the receiving list, resetting priorities to avoid conflict
			for (var i=0; i < idOrder.length; i++) {
				var id = idOrder[i].replace('clItem-','');

				var item = $scope.clItems.$getRecord(id);

				if (item === null) {
					// If we don't find an ID in clItems, it must be the new one - so add it's $priority and save it for later.
					newItem.$priority = i;
				} else {
					// Update $priority and $save all other items
					item.$priority = i;
					$scope.clItems.$save(item);
				}
			}

			// Add our newIem to the receiving list
			$scope.clItems.$add(newItem).then(function(ref) {
				// To avoid a blipping list when data is updated, first do the update, then overwrite the list values.
				ChecklistItems($scope.checklistId).$loaded(function(data) {
					$scope.clItems = data;
				});
			}).catch(genericError);

			// Remove our moveItem from the sending list, then re-index it's $priorities to avoid conflicts later down the line
			senderList.$remove(moveItem).then(function(ref) {
				// Not sure why, but senderList.length returns the original length of the array (including the item that was removed) but looping over senderList shows that the item isn't there.
				// To compensate for this, we're looking for the ID of the item that was removed.  When it's found, all other items are set to a priority of (s-1) to ensure consecutive priorities.
				var offset = false;
				for (var s=0; s < senderList.length; s++) {
					var senderItem = senderList[s];
					if (senderItem.$id == moveItem.$id) {
						offset = true;
					} else {
						senderItem.$priority = offset ? (s-1) : s;
						senderList.$save(senderItem);
					}
				}
			}).catch(genericError);
		});
	};*/


	/*  Managing Checklist Items  */
	$scope.addNewChecklistItem = function() {
		if ($scope.canListManage() && $scope.newChecklistItem.name.length) {
			checklistService.addNewListItem($scope.clItems,$scope.newChecklistItem,$scope.cl,$scope.resetNewChecklistItemData);
		}
	};

	/*$scope.saveChecklistItem = function(item) {
		checklistService.saveChecklistItem($scope.clItems,item,$scope.cl);
	};

	$scope.markChecklistItem = function(item) {
		//console.log('firing markChecklistItem',item);

		checklistService.markChecklistItem($scope.clItems,item,$scope.checklistId,$scope.cl);
	};*/


	/*  Managing the Checklist itself */
	$scope.editChecklistData = function() {
		if ($scope.canListManage()) {
			$scope.editData.name = angular.copy($scope.checklist.name);
			$scope.editData.desc = angular.copy($scope.checklist.desc);
			$scope.editData.editMode = true;
		}
	};

	$scope.saveChecklistData = function() {
		if ($scope.canListManage()) {
			if ($scope.myOwnedLists.$indexFor($scope.cl.$id) > -1) {
				$scope.myOwnedLists.$save($scope.cl).then(function(ref) {
					$scope.showCPinput = false;
					$scope.checklistColor = $scope.cl.color;
					$scope.checklistTextColor = $scope.cl.textColor;
				});
			} else if ($scope.mySharedLists.$indexFor($scope.cl.$id) > -1) {
				$scope.myOwnedLists.$save($scope.cl).then(function(ref) {
					$scope.showCPinput = false;
					$scope.checklistColor = $scope.cl.color;
					$scope.checklistTextColor = $scope.cl.textColor;
				});
			} else {
				$popup.show({
					title: 'Error saving checklist data'
					,template: 'Could not find checklist'
				});
			}

			var invalidKeys = ['editMode','showCPinput'];
			for (var key in $scope.editData) {
				if (invalidKeys.indexOf(key) == -1 && $scope.editData[key]) {
					$scope.checklist[key] = $scope.editData[key];
				}
			}

			$scope.checklist.$save().then(function(ref) {
				$scope.cancelChecklistEdit();
				$scope.checklistSettings.showListDetails = false;
			});
		} else {
			$popup.show({
				title: 'Changes were not saved'
				,template: 'You do not have permsissions to manage this list.'
			});
		}
	};

	$scope.showColorPicker = function() {
		if ($scope.canListManage()) {
			$scope.editData.showCPinput = true;
			$scope.editData.editMode = true;
		}
	};

	$scope.cancelChecklistEdit = function() {
		$scope.editData = {
			name: angular.copy($scope.checklist.name)
			,desc: angular.copy($scope.checklist.desc)
			,editMode: false
			,showCPinput: false
		}
	};

	function __doChecklistDelete() {
		//console.log('clShares',$scope.clShares);
		for (var user in $scope.clShares) {
			if ($scope.clShares.hasOwnProperty(user) && user.substring(0,1) != '$') {
				//console.log('user in clShares',user);

				var scl = ShareChecklist(user,$scope.checklistId);
				scl.$remove().then(function(ref) {
					//console.log('Share removed');
				}).catch(function(error) {
					console.log('share not removed, error ',error);
				});

				//console.log('scl',scl);
			}

		}
		$scope.clShares.$destroy();
		//$scope.inactiveClItems.$destroy();
		$scope.clItems.$destroy();
		$scope.checklist.$destroy();

		$scope.checklist.$remove().then(function(ref) {
			$scope.myOwnedLists.$remove($scope.myOwnedLists.$indexFor($scope.checklistId));
		});
	}

	$scope.deleteChecklist = function() {
		if ($scope.listIsOwned()) {

			$popup.confirm({
				title: 'Are you sure?',
				template: 'Do you really want to delete this checklist?  This cannot be undone!',
				okText: 'Yes, delete it',
				cancelText: "No, don't delete"
			}).then(__doChecklistDelete)


		}
	};

	$scope.convertChecklistToJobBranch = function() {
		$rootScope.$broadcast('trigger:convert-item-to-job',{list:$scope.checklist});
	};



	/*  Managing User Rights for a checklist  */
	$scope.removeListUser = function(userId) {
		console.log('firing removeListUser',userId);

		delete $scope.clShares[userId];
		$scope.clShares.$save();

		var scl = ShareChecklist(userId,$scope.checklistId);
		scl.$remove();
	};

	$scope.$watch(function() {
		return $scope.listUsers.shared;
	},function(newVal,oldVal) {
		if (typeof newVal == 'string') {
			//console.log('firing listUsers.shared watch',newVal);
			var newRight = ShareChecklist(newVal,$scope.checklistId);
			newRight.rights = 'viewOnly';
			newRight.$save();

			$scope.clShares[newVal] = 'viewOnly';
			$scope.clShares.$save();

			delete $scope.listUsers.shared;
		}
	});

	$scope.updateListUserRights = function(id,rights) {
		//console.log('id',rights);
		var scl = ShareChecklist(id,$scope.checklistId);

		scl.rights = rights;

		scl.$save();

		$scope.clShares[id] = rights;
		$scope.clShares.$save();
	}

	$rootScope.$on('checklist:delete-list',function(evt,args) {
		if ($scope.checklist.$id == args.id) {
			//console.log('doChecklistDelete()');
			__doChecklistDelete();
		}
	});
}]);
checklistModule.directive('checklist',[function() {
	return {
		restrict: 'A'
		,scope: true
		,templateUrl: 'partials/templates/checklist.html'
		,controller: 'checklistController'
		,link: function(scope,el,attrs) {
			scope.loadTopItems();
		}
	}
}]);

checklistModule.service('checklistService',['$popup','pfFireSyncService','pfUserService','ChecklistItem',function($popup,pfFireSyncService,pfUserService,ChecklistItem) {
	var svc = {
		addNewListItem: function(itemList,newItem,parentChecklist,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			//console.log(itemList);

			newItem.dateCreated = new Date().getTime();
			newItem.createdBy = pfUserService.currentUser.id;
			if (newItem.dateDue) newItem.dateDue = new Date(newItem.dateDue).getTime();

			//console.info('FireSync: newSubitem',newItem,$scope.cl);
			pfFireSyncService.announce({
				type: 'addChecklistItem'
				,listItem: newItem
				,topList: parentChecklist
			});

			itemList.$ref().transaction(function() {
				itemList.$add(newItem).then(function(data) {
					cb();
				}).catch(function(error) {
					$popup.show({
						title: 'An Error Occurred'
						,template: 'Could not add checklist item.  Please see console for details.'
					});
					console.log('Error in addNewChecklistItem',error);
					ecb();
				});
			});
		}
		,saveChecklistItem: function(itemList,item,parentChecklist,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			itemList.$ref().transaction(function() {
				delete item.editMode;
				delete item.originalValues;

				if (item.dateDue) {
					if (item.dateDue instanceof Date) {
						item.dateDue = item.dateDue.getTime();
					} else {
						item.dateDue = new Date(item.dateDue).getTime();
					}
				}
				item.dateUpdated = new Date().getTime();
				item.updatedBy = pfUserService.currentUser.id;

				itemList.$save(item).then(function(data) {
					//console.info('FireSync: updateChecklistItem',item,$scope.cl)
					pfFireSyncService.announce({
						type: 'updateChecklistItem'
						,listItem: item
						,list: parentChecklist
					});

					cb();
				}).catch(function(error) {
					$popup.show({
						title: 'An Error Occurred'
						,template: 'Could not save checklist item.  Please see console for details.'
					});
					console.log('Error in saveChecklistItem',error);
					ecb();
				})
			})
		}
		,deleteChecklistItem: function(itemList,item,parentChecklist,cb,ecb) {
			cb = cb || angular.noop;
			ecb = ecb || angular.noop;

			console.info('firing deleteChecklistItem');
			console.log(itemList);
			console.log(item);
			console.log(parentChecklist);

			itemList.$ref().transaction(function() {
				itemList.$remove(item).then(function(data) {
					pfFireSyncService.announce({
						type: 'deleteChecklistItem'
						,listItem: item
						,list: parentChecklist
					});

					//console.log('Remove was fired successfully',data);
				}).catch(function(error) {
					$popup.show({
						title: "Error occurred removing item."
						,template: "See the console for details."
						,okText: "OK"
					});
					console.log("Error in deleteChecklistItem",error);
					ecb();
				});
			});
		}
		,markChecklistItem: function(itemList,item,itemPath,parentChecklist) {
			//item.completed = !item.completed;
			itemList.$save(item).then(function(data) {
				//console.log('saveItem success',data);
			},function(error) {});

			/*console.log('itemPath',itemPath);

			var fItem = ChecklistItem(itemPath);
			console.log('fItem',fItem);
			//fItem.completed = !fItem.completed;*/

			/*pfFireSyncService.announce({
				type: fItem.completed ? 'checklistItemComplete' : 'checklistItemIncomplete'
				,listItem: fItem
				,list: parentChecklist
			});

			fItem.$save().then(function(data) {
				console.log('mcl success',data);
			},function(err) {
				console.log('mcl error',err);
			});*/

			//var _inactiveItems = ChecklistItems(parentChecklist.$id,'inactive')

			/*if (item.completed) {
				item.origPath = itemPath;
				console.log('set origPath to %o',item.origPath);
				// TODO:  Need to store item path somehow

				itemList.$remove(item);

				// TODO: Get a reference to the inactive itemList so we can store items there
				_inactiveItems.$add(item);

				//console.info('FireSync: checklistItemComplete',item,$scope.cl)

				//console.log('changed to inactive')
			} else {
				var op = item.origPath;
				delete item.origPath;

				console.log('remove origPath, op is %o',op,item);

				itemList.$add(item);
				_inactiveItems.$remove(item);

				//console.info('FireSync: checklistItemIncomplete',item,$scope.cl)
				pfFireSyncService.announce({
					type: 'checklistItemIncomplete'
					,listItem: item
					,list: parentChecklist
				});

				//console.log('changed to active');
			}*/
		}
	};

	return svc;
}]);

checklistModule.controller('checklistItemController',['$scope','$rootScope','$popup','ChecklistSubitems','checklistService','pfUtils',function($scope,$rootScope,$popup,ChecklistSubitems,checklistService,pfUtils) {
	$scope.controllerName = 'checklistItemController';

	$scope.subSettings = {};
	$scope.checklistItemPath = $scope.checklistItemParent + '/' + $scope.item.$id;

	$scope.hasListRight = function(right) {
		//console.log('hasRight',right,$scope.parentList.rights === right,$scope.parentList);
		return $scope.parentList.rights === right;
	};
	$scope.listIsOwned = function() {
		return $scope.hasListRight('owned');
	};
	$scope.canListManage = function() {
		return ($scope.listIsOwned() || $scope.hasListRight('manage'));
	};
	$scope.canListMark = function() {
		return ($scope.listIsOwned() || $scope.hasListRight('manage') || $scope.hasListRight('mark'));
	};
	$scope.listReadOnly = function() {
		return $scope.hasListRight('viewOnly');
	};

	$scope.toggleSubitemForm = function() {
		//console.log('firing openSubitemForm()');
		$scope.newSubitem = {
			completed: false
		};
		$scope.subSettings.showSubitemForm = !$scope.subSettings.showSubitemForm;
	};

	$scope.addNewSubitem = function() {
		/*console.info('firing addNewSubItem');
		console.log($scope.item);
		console.log($scope.newSubitem);*/

		if ($scope.canListManage() && $scope.newSubitem.name.length) {
			checklistService.addNewListItem($scope.subitems,$scope.newSubitem,$scope.parentList,$scope.clearSubitemForm);
		}
	};

	$scope.clearSubitemForm = function() {
		//console.log('firing clearSubitemForm');
		$scope.newSubitem = {
			completed: false
		};
		$scope.loadSubitems();
		//$scope.subSettings.showSubitemForm = false;
	};

	$scope.loadSubitems = function() {
		//console.info('firing loadSubitems',$scope.checklistItemPath)
		$scope.subitems = ChecklistSubitems($scope.checklistItemPath);

		// TODO:  Load only active checklistSubitems here, but put in a toggle that gets inherited from the parent scope's "showInactiveItems" setting

	};

	$scope.saveChecklistItem = function() {
		checklistService.saveChecklistItem(_getItemList(),$scope.item,$scope.parentList);
	};

	$scope.editChecklistItem = function() {
		if ($scope.canListManage()) {
			$scope.item.editMode = true;
			$scope.item.originalValues = angular.copy($scope.item);
		}
	};

	$scope.cancelEditChecklistItem = function() {
		//console.log('firing cancelEditChecklistItem',item);
		for (key in $scope.item.originalValues) {
			if ($scope.item.originalValues.hasOwnProperty(key) && key.substring(0,1) != '$') {
				$scope.item[key] = $scope.item.originalValues[key];
			}
		}
		delete $scope.item.editMode;
	};

	function _getItemList() {
		return $scope.$parent.subitems || $scope.$parent.$parentNodesScope.$modelValue;
	}

	$scope.deleteChecklistItem = function() {
		if ($scope.canListManage()) {
			$popup.confirm({
				title: "Are you sure?",
				template: "Deleted items cannot be recovered.",
				okText: 'Yes, delete this item',
				cancelText: "No, don't delete"
			}).then(function() {
				checklistService.deleteChecklistItem(_getItemList(),$scope.item,$scope.parentList);
			})
		}

	};

	$scope.markChecklistItem = function() {
		//console.log('marking item');
		checklistService.markChecklistItem(_getItemList(),$scope.item,$scope.checklistItemPath,$scope.parentList);
	};

	$rootScope.$on('checklist:delete-item',function(evt,args) {
		if ($scope.item.$id === args.id) {
			//console.log('in checklistItemController, firing checklist-delete-item for ',$scope.item);

			checklistService.deleteChecklistItem(_getItemList(),$scope.item,$scope.parentList);
		}
	});


	/*  Converting Checklist Items to Jobs  */
	$scope.convertItemToJob = function(item) {
		$rootScope.$broadcast('trigger:convert-item-to-job',{item:item,cb:$scope.convertItemCreateJob});
	};

	$scope.convertItemCreateJob = function(jobData) {
		console.log('firing convertItemCreateJob',$scope.item,jobData);
		try {
			var jobAttrs = {
				name: $scope.item.name
				,parentType: jobData.newParent.type
				,instanceId: jobData.newParent.instanceId
				,convertedListItem: $scope.iItem
			};
			if ($scope.item.desc) jobAttrs.description = $scope.item.desc;
			if ($scope.item.dateDue) jobAttrs.dueDate = $scope.item.dateDue;

			pfUtils.createJob(jobData.newParent.id,jobAttrs,$scope.convertItemCallback);
		} catch(e) {
			$popup.show({
				title: 'An Error Occurred'
				,template: 'Could not open the Create Job window.  Please see console for details.'
			});
			console.log('Error from convertItemCreateJob() in checklistController',e);
		}
	};

	$scope.convertItemCallback = function(item,jobId) {
		//console.log('firing convertItemSuccess',item,jobId,$scope.jobItem);

		if (item.removeWhenFinished &&
			$scope.jobItem.$id == item.$id) {
			//console.log('remove this item!',$scope.jobItem);
			$scope.clItems.$remove($scope.jobItem).then(function(ref) {
				//console.log('item was removed ',ref.key());
				delete $scope.jobItem;
			});
		}
	};


}]);
checklistModule.directive('checklistItem',['$compile',function($compile) {
	return {
		restrict: 'A'
		,scope: {
			checklistItemParent: '='
			,item: '=checklistItem'
			,parentList: '='
			,checklistSettings: '='
		}
		,controller: 'checklistItemController'
		,templateUrl: 'partials/templates/checklistChunks/checklist-itemTemplate.html'
		,link: function(scope,element,attrs) {

			scope.loadSubitems();
			var template = '<ul ui-tree-nodes class="list-subitems" ng-model="subitems">' +
								'<li ng-if="canListManage()" ng-show="subSettings.showSubitemForm" class="form-newChecklistItem sortable-false" ng-class="{\'checklist-advanced-entry\':!checklistSettings.showQuickEntry}">' +
									'<form name="newSubitemForm" ng-submit="addNewSubitem()">' +
										'<input type="text" ng-model="newSubitem.name" placeholder="{{checklistSettings.showQuickEntry ? \'New item\' : \'New item name\'}}" />' +
										'<span ng-show="!checklistSettings.showQuickEntry">' +
											'<textarea ng-model="newSubitem.desc" placeholder="Description"></textarea>' +
											'<input type="text" ng-model="newSubitem.dateDue" placeholder="Due date" ui-date="{ dateFormat: \'mm/dd/y\', defaultDate: null }" autocomplete="off"> ' +
										'</span>' +
										'<button class="btn btn-success" type="submit">Add</button>' +
									'</form>' +
								'</li>' +
								'<li ui-tree-node class="checklistItemNode" parent-list="parentList" checklist-item="item" checklist-item-parent="checklistItemPath" ng-repeat="item in subitems" ng-show="checklistSettings.showInactiveItems || !item.completed" id="clItem-{{item.$id}}" checklist-settings="checklistSettings"></li>' +
							'</ul>';
			$compile(template)(scope, function(cloned, scope){
				element.find('.item-subitems-container').append(cloned);
			});
		}
	}
}]);

checklistModule.controller('checklistPrintContainerController',['$scope','$element','Checklist','MyChecklists',function($scope,$element,Checklist,MyChecklists) {
	$scope.controllerName = 'checklistController';

	$scope.cl = {};
	$scope.listItems = [];

	$scope.loadChecklist = function(checklistId) {
		console.log('loading checklist %o',checklistId);
		$scope.checklistId = checklistId;
		MyChecklists($scope.checklistId).$bindTo($scope,'cl').then(function(data) {
			console.log('checklist data back',$scope.cl);


		})
	}

}]);
checklistModule.directive('checklistPrintContainer',[function() {
	return {
		restrict: 'A'
		,scope: true
		,templateUrl: 'partials/templates/checklist-print.html'
		,controller: 'checklistPrintContainerController'
		,link: function(scope,element,attrs) {
			scope.loadChecklist(attrs.checklistId);
		}
	}
}]);


checklistModule.controller('itemToJobConverterCtrl',['$scope','$element','$rootScope','$popup','pfInstanceService','pfUserService','pfJobService','pfFireSyncService',function($scope,$element,$rootScope,$popup,pfInstanceService,pfUserService,pfJobService,pfFireSyncService) {
	$scope.controllerName = "itemToJobConverterCtrl";

	$scope.show = function() {
		$element.removeClass('hide');
		$rootScope.$broadcast('trigger:show-modal-backdrop');
	};
	$scope.hide = function() {
		$element.addClass('hide');
		$rootScope.$broadcast('trigger:hide-modal-backdrop');
	};
	$scope.toggle = function() {
		$element.hasClass('hide') && $scope.show() || $scope.hide();
	};

	$scope.getUserInfo = pfUserService.getUserInfo;

	$scope.getJobTypeName = function(level) {
		level = level || 1;
		var jobs = ['Campaign','Project','Task','Subtask'];
		if (!$scope.conversionData.parentJob || !$scope.conversionData.parentJob.type) {
			return 'Select parent job';
		} else {
			var baseLevel = 0;
			switch($scope.conversionData.parentJob.type.toLowerCase()) {
				case "project": baseLevel = 1; break;
				case "task": baseLevel = 2; break;
			}
			level = baseLevel + level;
			return jobs[level];
		}
	};
	$scope.getJobTypeClass = function(level) {
		if (!$scope.conversionData.parentJob || !$scope.conversionData.parentJob.type) {
			return '';
		} else {
			return 'color-' + $scope.getJobTypeName(level).toLowerCase();
		}
	};
	$scope.getParentColorClass = function() {
		if ($scope.conversionData && $scope.conversionData.parentJobType) {
			return 'color-' + $scope.conversionData.parentJobType.toLowerCase();
		}
	};

	var unwatch;
	$scope.activeUsers = pfUserService.activeUsers;

	$scope.treeOptions = {
		accept: function(sourceNodeScope, destNodesScope, destIndex) {
			//console.info('in accept',sourceNodeScope,destNodesScope,destIndex);
			//console.log('in accept, destNodesScope.depth() is %o and parentJobType is %o',destNodesScope.depth(),$scope.conversionData.parentJobType);

			var accepted = true;
			var depth = destNodesScope.depth();

			switch($scope.conversionData.parentJobType.toLowerCase()) {
				case "campaign": if (depth >= 3) accepted = false; break;
				case "project": if (depth >= 2) accepted = false; break;
				case "task": if (depth >= 1) accepted = false; break;
			}

			return accepted;
		}
		,beforeDrag: function(sourceNodeScope) {
			// Check if the current selected node can be dragged.

			return true;  // false to disallow drag
		}
		,removed: function(node) {
			// If a node is removed, the removed callback will be called.
		}
		,dragStart: function(event) {
			/*console.info('drag start');
			 console.log(event);*/
			/*$scope.dragElement = event.elements.dragging;
			$scope.placeholderElement = event.elements.placeholder;*/
		}
		,dragMove: function(event) { }
		,dragStop: function(event) {
			/*console.info('drag stop');
			 console.log(event);*/

			/*$scope.dragElement.removeClass('angular-ui-tree-drag-invalid');*/
			//$scope.placeholderElement.removeClass('campaign').removeClass('project').removeClass('task').removeClass('subtask');
			//$scope.placeholderElement.text('');
			//TODO: reset placeholder and drag elements here
		}
		,beforeDrop: function(event) { }
		,dropped: function(event) {
			//console.warn('firing dropped',event);
			var depth = event.dest.nodesScope.depth();
			//console.log('depth?',depth);

			var item = event.source.nodeScope.$modelValue;
			item.level = depth + 1;
		}
	};

	$scope.toggleEdit = function(type,job) {
		for (var i=0; i < $scope.conversionData.newJobs.length; i++) {
			__resetEdit($scope.conversionData.newJobs[i]);

		}
		switch(type) {
			case "name": job.editName = true; break;
			case "date": job.editDate = true; break;
			case "owner": job.editOwner = true; break;
		}
	};

	$scope.startEdit = function(args) {
		$scope.cb = args.cb || angular.noop;

		$scope.conversionData = {
			convType: ''
			,userId: pfUserService.currentUser.id
			,instanceId: pfInstanceService.instanceId
			,newJobs: []
		};

		if (args.item) {
			$scope.conversionData.srcItem = args.item;
			$scope.conversionData.convType = 'item';
		} else if (args.list) {
			$scope.conversionData.srcItem = args.list;
			$scope.conversionData.convType = 'list';
		}

		unwatch = $scope.$watch(function() { return $scope.conversionData.parentJob; },function(newVal,oldVal) {
			if (newVal && newVal.type) {
				$scope.conversionData.parentJobType = newVal.type;
				$scope.conversionData.newJobs = [];
				__parseJobData($scope.conversionData.srcItem,'top');
			}
		});

		$scope.show();
	};

	$scope.validate = function() {
		var isValid = true;
		$scope.errordata = {};

		if (!$scope.conversionData.parentJob) {
			isValid = false;
			$scope.errordata.parentJob = 'Please select a parent job';
		}

		return isValid;
	};

	$scope.doConversion = function() {
		if ($scope.validate()) {
			console.warn('Do conversion!');
			console.log($scope.conversionData);

			var msgs = {
				text: ''
				,okBtn: ''
				,cxlBtn: ''
			};
			switch($scope.conversionData.convType) {
				case "list":
					msgs.text = "Do you want to delete the checklist (" + $scope.conversionData.srcItem.name + ") after creating these jobs? <span class='text-error'>Deleted checklists cannot be recovered!</span>";
					msgs.okBtn = "Yes, delete the checklist";
					msgs.cxlBtn = "No, just create the jobs";
					break;
				case "item":
					msgs.text = "Do you want to delete the checklist item (" + $scope.conversionData.srcItem.name + ") after creating this job? <span class='text-error'>Deleted items cannot be recovered!</span>";
					msgs.okBtn = "Yes, delete the checklist item";
					msgs.cxlBtn = "No, just create the job";
					break;
			}

			$popup.confirm({
				title: "Before we make any changes..."
				,template: msgs.text
				,okText: msgs.okBtn
				,cancelText: msgs.cxlBtn
			}).then(function() {
				//console.log('convert and delete');
				__doConversion(true);
			},function() {
				//console.log('convert and do not delete');
				__doConversion(false);
			})
		}
	};

	$scope.changeParentJob = function() {
		$popup.confirm({
			title: "Warning"
			,template: "If you change the parent job, any changes you've made below will be lost."
			,okText: "That's OK, change parents"
			,cancelText: "Keep parent"
		}).then(function() {
			delete $scope.conversionData.parentJob;
			delete $scope.conversionData.parentJobType;
		})
	};

	$scope.cancelEdit = function() {
		$scope.errordata = {};
		unwatch();
		delete $scope.conversionData;
		$scope.hide();
	};

	function __resetEdit(job) {
		job.editName = false;
		job.editDate = false;
		job.editOwner = false;
		if (job.children) {
			for (var j=0; j < job.children.length; j++) {
				__resetEdit(job.children[j]);
			}
		}
	}

	function __getDueDate() {
		return Date.now();
	}

	function __deepFind(items,id) {
		for (var i=0; i < items.length; i++) {
			if (items[i].srcId === id) {
				return items[i];
			} else {
				if (items[i].children) {
					return __deepFind(items[i].children,id);
				}
			}
		}
	}

	function __parseJobData(srcItem,parentId,level) {
		level = level || 1;

		if (!srcItem.completed) {
			var jobPak = {
				level: level
				,srcId: srcItem.$id
				,parentId: parentId
				,name: srcItem.name
				,desc: srcItem.desc
				,dueDate: srcItem.dateDue || __getDueDate()
				,owner: pfUserService.currentUser.id
				,instanceId: pfInstanceService.instanceId
				,children: []
			};

			if (parentId == 'top') {
				$scope.conversionData.newJobs.push(jobPak);
			} else {
				var parent = __deepFind($scope.conversionData.newJobs,parentId);
				if (!parent) {
					console.error('parent not found',parentId)
				} else {
					if (!parent.children) parent.children = [];
					parent.children.push(jobPak);
				}
			}
//console.log('in parseJobData',srcItem.items ? 'srcItem.items exists' : 'srcItem.items does not exist')
			if (srcItem.items) {
				var newParentId = srcItem.$id;

				if ($scope.conversionData.parentJob.type == 'Task' && level == 1
					|| $scope.conversionData.parentJob.type == 'Project' && level == 2
					|| $scope.conversionData.parentJob.type == 'Campaign' && level == 3) {
					newParentId = parentId;
				} else {
					level++;
				}
				for (var itemId in srcItem.items) {
					var item = srcItem.items[itemId];
					item.$id = itemId;
					__parseJobData(item,newParentId,level);
				}
			}
		}

	}

	function __allJobsAreConverted(jobs) {
		var allAreConverted = true;

		for (var i=0; i < jobs.length; i++) {
			var job = jobs[i];

			if (!job.converted) {
				//console.log('%o is not converted, return false',job.name);
				allAreConverted = false;
				break;
			} else if (job.children) {
				allAreConverted = __allJobsAreConverted(job.children);
			}
		}

		return allAreConverted;
	}

	function __makeChildJobs(job,parentId,cb) {
		cb = cb || angular.noop;

		var dataPak = {
			job: {
				description: job.desc
				,dueDate: new Date(job.dueDate).toJSON()
				,entity_type: $scope.getJobTypeName(job.level).toLowerCase()
				,name: job.name
				,parentId: parentId
				,startDate: new Date().toJSON()
				,sys_entityname: $scope.getJobTypeName(job.level)
			}
			,owner: job.owner
		};

		/*console.info('Make a job');
		console.log(job);
		console.log(dataPak);*/

		pfJobService.saveSummaryForJob(dataPak,function(savedData) {
			/*console.info('JOB SAVED');
			console.log(savedData);
			console.warn('ADD FIRESYNC HERE');*/

			var fireSyncPkg = {
				type: 'jobCreated'
				,dueDate: moment(dataPak.job.dueDate).format('YYYY-MM-DD')
				,startDate: moment(dataPak.job.startDate).format('YYYY-MM-DD')
				,ownerId: dataPak.owner
				,jobId: savedData.id
				,jobNumber: savedData.jobNumber
				,jobType: savedData.sys_entityname
				,name: savedData.name
				,parentId: savedData.parentId
				,jobInstanceId: savedData.instanceId
				,jobInstancePrefix: savedData.instancePrefix
				,notificationSent: savedData.notificationSent
			};

			pfFireSyncService.announce(fireSyncPkg);

			if (job.children) {
				for (var i=0; i<job.children.length; i++) {
					__makeChildJobs(job.children[i],savedData.id,cb);
				}
			}

			job.converted = true;
			job.jobId = savedData.id;
			//console.log('%o was just converted',job.name);

			if (__allJobsAreConverted($scope.conversionData.newJobs)) {
				//console.log('all jobs are converted');
				cb();
			}
		})


	}

	function __doConversion(deleteItem) {
		/*console.info('__doConversion');
		console.log('deleteItem: %o',deleteItem);*/

		/*__doPostConversion(deleteItem);*/

		for (var i=0; i < $scope.conversionData.newJobs.length; i++) {
			var job = $scope.conversionData.newJobs[i];
			__makeChildJobs(job,$scope.conversionData.parentJob.id,function() { __doPostConversion(deleteItem) });
		}
	}

	function __doPostConversion(deleteItem) {
		if (deleteItem) {
			var src = $scope.conversionData.srcItem;
			//console.log('item to delete ',src);
			$rootScope.$broadcast('checklist:delete-'+$scope.conversionData.convType,{id:src.$id});
		}

		$scope.cancelEdit();
	}

	$scope.$on('trigger:convert-item-to-job',function(evt,args) {
		/*console.info('Opening itemToJobConverter');
		console.log(args);*/
		$scope.startEdit(args);
	});

	$scope.$on('trigger:close-all-modals',function(event,args) {
		$scope.cancelEdit();
	});
}]);
checklistModule.directive('itemToJobConverter',[function() {
	return {
		restrict: 'A'
		,scope: true
		,templateUrl: 'partials/app/popups/template-itemToJobConverter.html'
		,controller: 'itemToJobConverterCtrl'
	}
}])

