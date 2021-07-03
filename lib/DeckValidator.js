'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var moment = require('moment');

var RestrictedList = require('./RestrictedList');

function getDeckCounts(deck) {
    var count = {
        drawCount: 0,
        jokerCount: 0,
        startingCount: 0,
        startingCost: 0
    };

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = deck[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var cardEntry = _step.value;

            if (cardEntry.card.type_code === 'joker') {
                count.jokerCount += cardEntry.count;
                continue;
            }
            if (cardEntry.starting) {
                var startingCount = cardEntry.starting;
                // Xiaodan Li - does not count towards limit
                if (cardEntry.card.code === '09006') {
                    startingCount = 0;
                }
                // Harvester - counts as 3 dudes
                if (cardEntry.card.code === '16005') {
                    startingCount = cardEntry.starting * 3;
                }
                count.startingCount += startingCount;
                count.startingCost += cardEntry.card.cost * cardEntry.starting;
            }
            count.drawCount += cardEntry.count;
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    return count;
}

function getKeywords(card) {
    var keywordArray = card.keywords.split('\u2022');
    return keywordArray.map(function (keyword) {
        return keyword.trim().toLowerCase();
    });
}

function isCardInReleasedPack(packs, card) {
    var pack = packs.find(function (pack) {
        return card.pack_code === pack.code;
    });

    if (!pack) {
        return false;
    }

    var releaseDate = pack.available || pack.date_release;

    if (!releaseDate) {
        return false;
    }

    releaseDate = moment(releaseDate, 'YYYY-MM-DD');
    var now = moment();

    return releaseDate <= now;
}

var legendRules = {};

var DeckValidator = function () {
    function DeckValidator(packs, restrictedListRules) {
        _classCallCheck(this, DeckValidator);

        this.packs = packs;
        this.restrictedLists = restrictedListRules.map(function (rl) {
            return new RestrictedList(rl);
        });
    }

    _createClass(DeckValidator, [{
        key: 'validateDeck',
        value: function validateDeck(deck) {
            var errors = [];
            var unreleasedCards = [];
            var rules = this.getRules(deck);

            var _getDeckCounts = getDeckCounts(deck.drawCards),
                drawCount = _getDeckCounts.drawCount,
                jokerCount = _getDeckCounts.jokerCount,
                startingCount = _getDeckCounts.startingCount,
                startingCost = _getDeckCounts.startingCost;

            if (drawCount !== rules.requiredDraw) {
                errors.push(drawCount + ' cards with printed value (required 52)');
            }
            if (jokerCount > rules.maxJokerCount) {
                errors.push('Too many Joker cards');
            }
            if (startingCount > rules.maxStartingCount) {
                errors.push('Too many cards in starting posse');
            }
            if (deck.outfit && startingCost > deck.outfit.wealth) {
                errors.push('Negative starting Ghost Rock');
            }

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = rules.rules[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var rule = _step2.value;

                    if (!rule.condition(deck)) {
                        errors.push(rule.message);
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            var allCards = deck.drawCards;
            var cardCountByValue = {};

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = allCards[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var cardQuantity = _step3.value;

                    cardCountByValue[cardQuantity.card.value] = cardCountByValue[cardQuantity.card.value] || { value: cardQuantity.card.value, count: 0 };
                    cardCountByValue[cardQuantity.card.value].count += cardQuantity.count;
                    if (!isCardInReleasedPack(this.packs, cardQuantity.card)) {
                        unreleasedCards.push(cardQuantity.card.title + ' is not yet released');
                    }
                    if (cardQuantity.count < cardQuantity.starting) {
                        errors.push('Starting count for a card ' + cardQuantity.card.title + ' is greater than its count');
                    }
                    if (cardQuantity.starting) {
                        var keywords = getKeywords(cardQuantity.card);
                        if (cardQuantity.starting > 1 && !keywords.find(function (keyword) {
                            return keyword === 'non-unique';
                        })) {
                            errors.push('Starting multiple copies of unique card ' + cardQuantity.card.title);
                        }
                        if (cardQuantity.card.type_code === 'deed' && !keywords.find(function (keyword) {
                            return keyword === 'core';
                        })) {
                            errors.push('Starting non-core deed ' + cardQuantity.card.title);
                        }
                    }
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = Object.values(cardCountByValue)[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var card = _step4.value;

                    if (card.count > 4) {
                        errors.push('Too many cards with same value: ' + card.value);
                    }
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            var uniqueCards = allCards.map(function (cardQuantity) {
                return cardQuantity.card;
            });
            var restrictedListResults = this.restrictedLists.map(function (restrictedList) {
                return restrictedList.validate(uniqueCards);
            });
            var officialRestrictedResult = restrictedListResults[0];

            var restrictedListErrors = restrictedListResults.reduce(function (errors, result) {
                return errors.concat(result.errors);
            }, []);

            return {
                basicRules: errors.length === 0,
                restrictedRules: officialRestrictedResult.restrictedRules,
                noBannedCards: officialRestrictedResult.noBannedCards,
                restrictedLists: restrictedListResults,
                noUnreleasedCards: true,
                drawCount: drawCount,
                extendedStatus: errors.concat(unreleasedCards).concat(restrictedListErrors)
            };
        }
    }, {
        key: 'getRules',
        value: function getRules(deck) {
            var standardRules = {
                requiredDraw: 52,
                maxJokerCount: 2,
                maxStartingCount: 5
            };
            var outfitRules = this.getOutfitRules();
            var legendRules = this.getLegendRules(deck);
            return this.combineValidationRules([standardRules, outfitRules].concat(legendRules));
        }
    }, {
        key: 'getOutfitRules',
        value: function getOutfitRules() {
            //No inclusion restrictions for outfit as of TCaR
            return [];
        }
    }, {
        key: 'getLegendRules',
        value: function getLegendRules(deck) {
            if (!deck.legend) {
                return [];
            }

            var allLegends = [];
            return allLegends.map(function (legend) {
                return legendRules[legend.code];
            });
        }
    }, {
        key: 'combineValidationRules',
        value: function combineValidationRules(validators) {
            var mayIncludeFuncs = validators.map(function (validator) {
                return validator.mayInclude;
            }).filter(function (v) {
                return !!v;
            });
            var cannotIncludeFuncs = validators.map(function (validator) {
                return validator.cannotInclude;
            }).filter(function (v) {
                return !!v;
            });
            var combinedRules = validators.reduce(function (rules, validator) {
                return rules.concat(validator.rules || []);
            }, []);
            var combined = {
                mayInclude: function mayInclude(card) {
                    return mayIncludeFuncs.some(function (func) {
                        return func(card);
                    });
                },
                cannotInclude: function cannotInclude(card) {
                    return cannotIncludeFuncs.some(function (func) {
                        return func(card);
                    });
                },
                rules: combinedRules
            };

            return Object.assign.apply(Object, [{}].concat(_toConsumableArray(validators), [combined]));
        }
    }]);

    return DeckValidator;
}();

module.exports = DeckValidator;