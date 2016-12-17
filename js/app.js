
angular.module('fgoImages', [])

        .controller('fgoImagesController', fgoImagesController);

function fgoImagesController($sce, $http) {
    var vm = this;

    var urlBase = "http://fate-go.cirnopedia.org";
    var servantStorage = "FGO_Servants";
    var servantCountStorage = "numberOfServants";
    var essenceStorage = "FGO_CEs";
    var essenceCountStorage = "numberOfCEs";


    vm.numberOfServants = 0;
    vm.numberOfCEs = 0;
    vm.servantFilter = {};

    vm.getServantImage = getServantImage;
    vm.getCEImage = getCEImage;
    vm.reloadServants = loadServantData;
    vm.reloadEssences = loadCraftEssenceData;
    vm.zoomIn = zoomIn;
    vm.filterServants = filterServants;

    init();

    function init() {
        loadServants();
        loadCraftEssences();
    }

    function loadCraftEssences() {
        if (localStorage[essenceCountStorage]) {
            vm.numberOfCEs = parseInt(localStorage[essenceCountStorage]);
        }
        if (localStorage[essenceStorage]) {
            vm.craftEssences = JSON.parse(localStorage[essenceStorage]);
        }
        getProxyPage(urlBase + '/craft_essence.php', function (element) {
            var numberOfCEs = $('#list', element).nextAll().find('#rounded-corner').first().find('tbody tr').length;
            if (!localStorage[essenceStorage] || vm.numberOfCEs < numberOfCEs) {
                vm.numberOfCEs = numberOfCEs;
                loadCraftEssenceData();
            }
        });
    }

    function loadCraftEssenceData() {
        vm.craftEssences = [];
        async.timesLimit(vm.numberOfCEs, 10, function (index, next) {
            var i = index + 1;
            var craftEssenceUrl = urlBase + "/craft_essence_profile.php?essence=";
            getProxyPage(craftEssenceUrl + i, function (element) {
                parseCraftEssence(i, element);
                next();
            });
        }, function () {
            vm.craftEssences = _.sortBy(vm.craftEssences, ['id']);
            localStorage[essenceStorage] = JSON.stringify(vm.craftEssences);
            localStorage[essenceCountStorage] = vm.numberOfCEs;
        });
    }

    function loadServants() {
        if (localStorage[servantCountStorage]) {
            vm.numberOfServants = parseInt(localStorage[servantCountStorage]);
        }
        if (localStorage[servantStorage]) {
            vm.servants = JSON.parse(localStorage[servantStorage]);
        }
        getProxyPage(urlBase + '/servant_all.php', function (element) {
            var numberOfServants = $('#all', element).nextAll().find('#rounded-corner').first().find('tbody tr').length - 1;
            if (!localStorage[servantStorage] || vm.numberOfServants < numberOfServants) {
                vm.numberOfServants = numberOfServants;
                loadServantData();
            }
        });
    }

    function loadServantData() {
        vm.servants = [];
        async.timesLimit(vm.numberOfServants, 10, function (index, next) {
            var i = index + 1;
            var servantUrl = urlBase + "/servant_profile.php?servant=";
            getProxyPage(servantUrl + (i === 1 ? '1.5' : i), function (element) {
                parseServant(i, element);
                next();
            });
        }, function () {
            _.each(vm.servants, function (servant) {
                delete servant.details;
            });
            vm.servants = _.sortBy(vm.servants, ['id']);
            localStorage[servantStorage] = JSON.stringify(vm.servants);
            localStorage[servantCountStorage] = vm.numberOfServants;
        });
    }

    function getServantImage(servant, level) {
        var url = urlBase + "/icons/servant_card/" + _.padStart(servant, 3, '0') + level + ".jpg";
        return url;
    }

    function getCEImage(essence) {
        var url = urlBase + "/icons/essence/craft_essence_" + _.padStart(essence, 3, '0') + ".jpg";
        return url;
    }

    function getProxyPage(page, callback) {
        //var proxyBase = "http://cors-proxy.htmldriven.com/?url=";
        var proxyBase = "http://cors-anywhere.herokuapp.com/";
        $http.get(proxyBase + page).then(function (response) {
            var rawHtml = response.data;
            var element = $('<div></div>');
            element.html(rawHtml);
            callback(element);
        });
    }

    function parseCraftEssence(id, html) {
        var craftEssence = {id: id};
        craftEssence.name = $('spanh', html).first().html();
        craftEssence.image = getCEImage(id);
        vm.craftEssences.push(craftEssence);
    }

    function parseServant(id, html) {
        var servant = {id: id};
        servant.name = $('spanh', html).first().html();
        vm.servants.push(servant);
        servant.images = {
            firstForm: getServantImage(id, 1),
            secondForm: getServantImage(id, 2),
            thirdForm: getServantImage(id, 3),
            fourthForm: getServantImage(id, 4)
        };

        var profileTables = $('#profile', html).nextUntil('#interlude').find('#rounded-corner');
        var statsArray = $(profileTables[2]).find('.desc').map(function () {
            return $(this).html().trim()
        });
        servant.class = $($('#rounded-corner', html).find('td.desc')[2]).html().trim();
        servant.stats = {
            str: statsArray[0],
            end: statsArray[1],
            agi: statsArray[2],
            mgi: statsArray[3],
            lck: statsArray[4],
            np: statsArray[5]
        };

        servant.description = $(profileTables[1]).find('td').html().trim();

        servant.background = [];
        for (var i = 4; i < profileTables.length; i++) {
            var backgroundData = $(profileTables[i]).find('tbody td');
            var background = {
                description: $(backgroundData[backgroundData.length - 1]).html().trim().split("<br>")
            }
            if (backgroundData.length > 1) {
                background.title = $(backgroundData[0]).find('spanh').html();
                background.subtitle = $(backgroundData[0]).contents().filter(function () {
                    return this.nodeType == 3;
                }).first().text() || undefined;
            }
            if (backgroundData.length === 3) {
                background.info = $(backgroundData[1]).html().trim().split("<br>");
            }
            servant.background.push(background);
        }
    }

    function zoomIn(event) {
        $(event.currentTarget).toggleClass('fixed');
    }
    
    function filterServants() {
        return _.filter(vm.servants, function(servant) {
            return !vm.servantFilter.name || _.includes(_.lowerCase(servant.name), _.lowerCase(vm.servantFilter.name));
        });
    }
}
fgoImagesController.$inject = ['$sce', '$http'];