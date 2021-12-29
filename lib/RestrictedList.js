'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RestrictedList = function () {
    function RestrictedList(rules) {
        _classCallCheck(this, RestrictedList);

        this.rules = rules;
    }

    _createClass(RestrictedList, [{
        key: 'isCardRestricted',
        value: function isCardRestricted(card) {
            if (this.rules.restricted && this.rules.restricted.includes(card.code)) {
                return true;
            }
            var isRestricted = false;
            if (this.rules.restrictedFrom && this.rules.restrictedFrom <= card.code) {
                isRestricted = true;
            }
            if (this.rules.restrictedUpTo) {
                if (this.rules.restrictedUpTo >= card.code) {
                    isRestricted = true;
                } else {
                    isRestricted = false;
                }
            }
            if (this.rules.restrictedExceptions && this.rules.restrictedExceptions.includes(card.code)) {
                isRestricted = false;
            }
            return isRestricted;
        }
    }, {
        key: 'validate',
        value: function validate(cards) {
            var _this = this;

            var restrictedCardsOnList = cards.filter(function (card) {
                return _this.isCardRestricted(card);
            });
            var bannedCardsOnList = cards.filter(function (card) {
                return _this.rules.banned.includes(card.code);
            });
            var noBannedCards = true;

            var errors = [];

            if (restrictedCardsOnList.length > 1) {
                errors.push(this.rules.name + ': Contains more than 1 card on the restricted list: ' + restrictedCardsOnList.map(function (card) {
                    return card.title;
                }).join(', '));
            }

            if (bannedCardsOnList.length > 0) {
                noBannedCards = false;
                errors.push(this.rules.name + ': Contains cards that are banned: ' + bannedCardsOnList.map(function (card) {
                    return card.title;
                }).join(', '));
            }

            return {
                name: this.rules.name,
                valid: errors.length === 0,
                restrictedRules: restrictedCardsOnList.length === 0,
                noBannedCards: noBannedCards,
                errors: errors,
                restrictedCards: restrictedCardsOnList,
                bannedCards: bannedCardsOnList
            };
        }
    }]);

    return RestrictedList;
}();

module.exports = RestrictedList;