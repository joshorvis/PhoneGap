var im = angular.module('instanceDataModule',[]);

function addCSSRule(sheet, selector, rules, index) {
	index = index || sheet.cssRules.length;

	if("insertRule" in sheet) {
		sheet.insertRule(selector + " {" + rules + "}", index);
	} else if("addRule" in sheet) {
		sheet.addRule(selector, rules, index);
	}
}

im.service('pfInstanceService',['pfInstanceAdminService',function(pfInstanceAdminService) {

	var svc = {
		instanceId: ''
		,sharedInstances: []
		,allInstances: []
		,setupInstance: function(instanceId,cb) {
			cb = cb || angular.noop;

			pfInstanceAdminService.getInstances(function(data) {
				svc.allInstances = data;
			});

			pfInstanceAdminService.getInstance(instanceId,function(data) {
				svc.instanceId = instanceId;

				var ds = document.getElementById('dynamicCSS');

				if (ds) {
					ds = ds.sheet;
					
					if (data.bgimage) {
						var bgImg = "url('" + data.bgimage+"')";
						addCSSRule(ds,"body","background-image: " + bgImg + ";");
						//$('body').css('background-image',bgImg);
					}

					if (data.navcolorbg) {
						if (!data.navcolorhilite) data.navcolorhilite = data.navcolorbg;
						if (!data.navcolortext) data.navcolortext = 'white';
						/*
						 *
						 * BG color: rgb(0,240,28)
						 Hilite color: rgb(0,150,13)
						 Text color: rgb(247,247,247)

						 */
						var bigRule =
							" background-color: " + data.navcolorbg + "; " +
							" border-color: " + data.navcolorhilite + "; " +
							" color: " + data.navcolortext + "; " +
							" background-image: linear-gradient(to bottom, " + data.navcolorbg + ", " + data.navcolorhilite + "); " +
							" background-image: -webkit-gradient(linear, 0 0, 0 100%, from(" + data.navcolorbg + "), to(" + data.navcolorhilite + ")); " +
							" background-image: -webkit-linear-gradient(top, " + data.navcolorbg + ", " + data.navcolorhilite + "); ";

						addCSSRule(ds,"#pf-navbar .navbar-inner",bigRule);

						//$('').css('background-color',data.navcolorbg);
						//$('#pf-navbar .navbar-inner').css('background-image','linear-gradient(to bottom, '+data.navcolorhilite+', '+data.navcolorbg+')');
						//$('#pf-navbar .navbar-inner').css('background-image','-webkit-gradient(linear, 0 0, 0 100%, from('+data.navcolorhilite+'), to('+data.navcolorbg+'))');
						//$('#pf-navbar .navbar-inner').css('background-image','-webkit-linear-gradient(top, '+data.navcolorhilite+', '+data.navcolorbg+')');
						//$('#pf-navbar .navbar-inner').css('border-color',data.navcolorbg);
						//$('#pf-navbar .navbar-inner').css('color',data.navcolortext);

						addCSSRule(ds,"#pf-navbar .navbar-inner .brand","color: " + data.navcolortext + ";");
						//$('#pf-navbar .navbar-inner .brand').css('color',data.navcolortext);

						addCSSRule(ds,"#pf-navbar .navbar-inner .nav > li > a","color: " + data.navcolortext + ";");
						addCSSRule(ds,"#pf-navbar .navbar-inner .nav > li.active > a, #pf-navbar .navbar-inner .nav > li.active > a:hover, #pf-navbar .navbar-inner .nav > li.active > a:focus","background-color: " + data.navcolorhilite + ";");
						addCSSRule(ds,"#pf-navbar .navbar-inner .nav > li.dropdown.open > .dropdown-toggle,#pf-navbar .navbar-inner .nav > li.dropdown.active > .dropdown-toggle,#pf-navbar .navbar-inner .nav > li.dropdown.open.active > .dropdown-toggle","background-color: " + data.navcolorhilite + ";");
						//$('#pf-navbar .navbar-inner .nav > li > a').css('color',data.navcolortext);
						//$('#pf-navbar .navbar-inner .nav > li.active > a, #pf-navbar .navbar-inner .nav > li.active > a:hover, #pf-navbar .navbar-inner .nav > li.active > a:focus').css('background-color',data.navcolorhilite);
						//$('#pf-navbar .navbar-inner .nav > li.dropdown.open > .dropdown-toggle,#pf-navbar .navbar-inner .nav > li.dropdown.active > .dropdown-toggle,#pf-navbar .navbar-inner .nav > li.dropdown.open.active > .dropdown-toggle').css('background-color',data.navcolorhilite);

						addCSSRule(ds,".navbar-inverse .nav li.dropdown > .dropdown-toggle .caret","border-top-color: " + data.navcolortext + "; border-bottom-color: " + data.navcolortext + ";")

						var dropdownRule = "color: " + data.navcolortext + ";" +
							"text-decoration: none;" +
							"background-color:" + data.navcolorbg + ";" +
								//"background-color: #0081c2;" +
							"background-image: -moz-linear-gradient(top," + data.navcolorbg + ", " + data.navcolorhilite + ");" +
							"background-image: -webkit-gradient(linear, 0 0, 0 100%, from(" + data.navcolorbg + "), to(" + data.navcolorhilite + "));" +
							"background-image: -webkit-linear-gradient(top," + data.navcolorbg + ", " + data.navcolorhilite + ");" +
							"background-image: -o-linear-gradient(top," + data.navcolorbg + ", " + data.navcolorhilite + ");" +
							"background-image: linear-gradient(to bottom," + data.navcolorbg + ", " + data.navcolorhilite + ");" +
							"background-repeat: repeat-x;" +
							"filter: progid:dximagetransform.microsoft.gradient(startColorstr='" + data.navcolorbg + "', endColorstr='" + data.navcolorbg + "', GradientType=0);";
						addCSSRule(ds,".dropdown-menu li > a:hover, .dropdown-menu li > a:focus, .dropdown-submenu:hover > a",dropdownRule)
					}

				}



				cb();
			})
		}
		,getInstanceIDsForUser: function(userId,cb,ecb) {
			pfInstanceAdminService.getInstanceIDsForUser(userId,function(data) {
				svc.sharedInstances = data;
				cb(data);
			},ecb);
		}
		,getInstances: pfInstanceAdminService.getInstances
		,getInstance: pfInstanceAdminService.getInstance
	};

	return svc;

}]);

im.service('pfInstanceAdminService',['$resource','$q',function($resource,$q) {
	var instResource = $resource(
		'http://192.168.1.5:83/api/instanceData.cfc'
		,{}
		,{
			getInstances: {
				method: 'GET'
				,isArray: true
				,params: {
					method: 'getInstances'
				}
			}
			,getInstance: {
				method: 'GET'
				,isArray: false
				,params: {
					method: 'getInstances'
				}
			}
			,saveInstance: {
				method: 'POST'
				,isArray: false
				,params: {
					method: 'saveInstance'
				}
			}
			,archiveInstance: {
				method: 'GET'
				,isArray: false
				,params: {
					method: 'archiveInstance'
				}
			}
			,restoreInstance: {
				method: 'GET'
				,isArray: false
				,params: {
					method: 'restoreInstance'
				}
			}
			,addActorToInstance: {
				method: 'GET'
				,isArray: false
				,params: {
					method: 'addActorToInstance'
				}
			}
			,removeActorFromInstance: {
				method: 'GET'
				,isArray: false
				,params: {
					method: 'removeActorFromInstance'
				}
			}
			,getInstanceNativeUsers: {
				method: 'GET'
				,isArray: true
				,params: {
					method: 'getInstanceNativeUsers'
				}
			}
			,getInstanceForeignUsers: {
				method: 'GET'
				,isArray: true
				,params: {
					method: 'getInstanceForeignUsers'
				}
			}
			,getCampaignsForInstance: {
				method: 'GET'
				,isArray: true
				,params: {
					method: 'getCampaignsForInstance'
				}
			}
			,getInstanceIDsForUser: {
				method: 'GET'
				,isArray: true
				,params: {
					method: 'getInstanceIDsForUser'
					,returnType: 'array'
				}
			}
			,saveForeignUsers: {
				method: 'POST'
				,isArray: true
				,params: {
					method: 'saveForeignUsers'
				}
			}
		}
	);
	this.getInstances = function(cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.getInstances(
			{},
			function(data) {


				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.getInstance = function(instanceId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.getInstance(
			{
				id:instanceId
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.getInstanceIDsForUser = function(userId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.getInstanceIDsForUser(
			{
				userId:userId
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.saveInstance = function(data,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.saveInstance(
			{
				data:data
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.archiveInstance = function(instanceId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.archiveInstance(
			{
				id:instanceId
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.restoreInstance = function(instanceId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.restoreInstance(
			{
				id:instanceId
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.addActorToInstance = function(input,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var doConnect = true;
		if (!input.actorId) {
			doConnect = false;
			genericError('Cannot connect actor to instance without an actorId',input);
		}
		if (!input.instanceId) {
			doConnect = false;
			genericError('Cannot connect actor to instance without an instanceId',input);
		}
		if (doConnect) {
			var d = $q.defer();

			instResource.addActorToInstance(
				input,
				function(data) {
					d.resolve(data);
					cb(data);
				},
				function (e) {
					d.reject(e);
					ecb(e);
				}
			);

			return d.promise;
		}

	};

	this.removeActorFromInstance = function(input,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var doConnect = true;
		if (!input.actorId) {
			doConnect = false;
			genericError('Cannot remove actor from instance without an actorId',input);
		}
		if (!input.instanceId) {
			doConnect = false;
			genericError('Cannot remove actor from instance without an instanceId',input);
		}
		if (doConnect) {
			var d = $q.defer();

			instResource.removeActorFromInstance(
				input,
				function(data) {
					d.resolve(data);
					cb(data);
				},
				function (e) {
					d.reject(e);
					ecb(e);
				}
			);

			return d.promise;
		}

	};

	this.getInstanceNativeUsers = function(instanceId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.getInstanceNativeUsers(
			{
				instanceId:instanceId
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.getInstanceForeignUsers = function(instanceId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.getInstanceForeignUsers(
			{
				instanceId:instanceId
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.saveForeignUsers = function(input,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.saveForeignUsers(
			input,
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

	this.getCampaignsForInstance = function(instanceId,cb,ecb) {
		cb = cb || angular.noop;
		ecb = ecb || angular.noop;

		var d = $q.defer();

		instResource.getCampaignsForInstance(
			{
				instanceId:instanceId
			},
			function(data) {
				d.resolve(data);
				cb(data);
			},
			function (e) {
				d.reject(e);
				ecb(e);
			}
		);

		return d.promise;
	};

}]);

