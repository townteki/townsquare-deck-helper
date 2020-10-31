'use strict';

function getDeckCount(deck) {
    var count = 0;

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = deck[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var cardEntry = _step.value;

            count += cardEntry.count;
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

function hasKeyword(card, keywordRegex) {
    var lines = card.text.split('\n');
    var keywordLine = lines[0] || '';
    var keywords = keywordLine.split('.').map(function (keyword) {
        return keyword.trim();
    }).filter(function (keyword) {
        return keyword.length !== 0;
    });

    return keywords.some(function (keyword) {
        return keywordRegex.test(keyword);
    });
}

function hasTrait(card, trait) {
    return card.traits.some(function (t) {
        return t.toLowerCase() === trait.toLowerCase();
    });
}

function rulesForBanner(faction, factionName) {
    return {
        mayInclude: function mayInclude(card) {
            return card.faction === faction && !card.loyal && card.type !== 'plot';
        },
        rules: [{
            message: 'Must contain 12 or more ' + factionName + ' cards',
            condition: function condition(deck) {
                return getDeckCount(deck.drawCards.filter(function (cardQuantity) {
                    return cardQuantity.card.faction === faction;
                })) >= 12;
            }
        }]
    };
}

function rulesForDraft(properties) {
    return Object.assign({ requiredDraw: 40, requiredPlots: 5 }, properties);
}

/**
 * Validation rule structure is as follows. All fields are optional.
 *
 * requiredDraw  - the minimum amount of cards required for the draw deck.
 * requiredPlots - the exact number of cards required for the plot deck.
 * maxDoubledPlots - the maximum amount of plot cards that can be contained twice in the plot deck.
 * mayInclude    - function that takes a card and returns true if it is allowed in the overall deck.
 * cannotInclude - function that takes a card and return true if it is not allowed in the overall deck.
 * rules         - an array of objects containing a `condition` function that takes a deck and return true if the deck is valid for that rule, and a `message` used for errors when invalid.
 */
var agendaRules = {
    // Banner of the stag
    '01198': rulesForBanner('baratheon', 'Baratheon'),
    // Banner of the kraken
    '01199': rulesForBanner('greyjoy', 'Greyjoy'),
    // Banner of the lion
    '01200': rulesForBanner('lannister', 'Lannister'),
    // Banner of the sun
    '01201': rulesForBanner('martell', 'Martell'),
    // Banner of the watch
    '01202': rulesForBanner('thenightswatch', 'Night\'s Watch'),
    // Banner of the wolf
    '01203': rulesForBanner('stark', 'Stark'),
    // Banner of the dragon
    '01204': rulesForBanner('targaryen', 'Targaryen'),
    // Banner of the rose
    '01205': rulesForBanner('tyrell', 'Tyrell'),
    // Fealty
    '01027': {
        rules: [{
            message: 'You cannot include more than 15 neutral cards in a deck with Fealty',
            condition: function condition(deck) {
                return getDeckCount(deck.drawCards.filter(function (cardEntry) {
                    return cardEntry.card.faction === 'neutral';
                })) <= 15;
            }
        }]
    },
    // Kings of Summer
    '04037': {
        cannotInclude: function cannotInclude(card) {
            return card.type === 'plot' && hasTrait(card, 'Winter');
        },
        rules: [{
            message: 'Kings of Summer cannot include Winter plot cards',
            condition: function condition(deck) {
                return !deck.plotCards.some(function (cardQuantity) {
                    return hasTrait(cardQuantity.card, 'Winter');
                });
            }
        }]
    },
    // Kings of Winter
    '04038': {
        cannotInclude: function cannotInclude(card) {
            return card.type === 'plot' && hasTrait(card, 'Summer');
        },
        rules: [{
            message: 'Kings of Winter cannot include Summer plot cards',
            condition: function condition(deck) {
                return !deck.plotCards.some(function (cardQuantity) {
                    return hasTrait(cardQuantity.card, 'Summer');
                });
            }
        }]
    },
    // Rains of Castamere
    '05045': {
        requiredPlots: 12,
        rules: [{
            message: 'Rains of Castamere must contain exactly 5 different Scheme plots',
            condition: function condition(deck) {
                var schemePlots = deck.plotCards.filter(function (cardQuantity) {
                    return hasTrait(cardQuantity.card, 'Scheme');
                });
                return schemePlots.length === 5 && getDeckCount(schemePlots) === 5;
            }
        }]
    },
    // Alliance
    '06018': {
        requiredDraw: 75,
        rules: [{
            message: 'Alliance cannot have more than 2 Banner agendas',
            condition: function condition(deck) {
                return !deck.bannerCards || deck.bannerCards.length <= 2;
            }
        }]
    },
    // The Brotherhood Without Banners
    '06119': {
        cannotInclude: function cannotInclude(card) {
            return card.type === 'character' && card.loyal;
        },
        rules: [{
            message: 'The Brotherhood Without Banners cannot include loyal characters',
            condition: function condition(deck) {
                return !deck.drawCards.some(function (cardQuantity) {
                    return cardQuantity.card.type === 'character' && cardQuantity.card.loyal;
                });
            }
        }]
    },
    // The Conclave
    '09045': {
        mayInclude: function mayInclude(card) {
            return card.type === 'character' && hasTrait(card, 'Maester') && !card.loyal;
        },
        rules: [{
            message: 'Must contain 12 or more Maester characters',
            condition: function condition(deck) {
                return getDeckCount(deck.drawCards.filter(function (cardQuantity) {
                    return cardQuantity.card.type === 'character' && hasTrait(cardQuantity.card, 'Maester');
                })) >= 12;
            }
        }]
    },
    // The Wars To Come
    '10045': {
        requiredPlots: 10,
        maxDoubledPlots: 2
    },
    // The Free Folk
    '11079': {
        cannotInclude: function cannotInclude(card) {
            return card.faction !== 'neutral';
        }
    },
    // Kingdom of Shadows
    '13079': {
        mayInclude: function mayInclude(card) {
            return !card.loyal && hasKeyword(card, /Shadow \(\d+\)/);
        }
    },
    // The White Book
    '13099': {
        mayInclude: function mayInclude(card) {
            return card.type === 'character' && hasTrait(card, 'Kingsguard') && !card.loyal;
        },
        rules: [{
            message: 'Must contain 7 or more different Kingsguard characters',
            condition: function condition(deck) {
                var kingsguardChars = deck.drawCards.filter(function (cardQuantity) {
                    return cardQuantity.card.type === 'character' && hasTrait(cardQuantity.card, 'Kingsguard');
                });
                return kingsguardChars.length >= 7;
            }
        }]
    },
    // Valyrian Steel
    '13118': {
        requiredDraw: 75,
        rules: [{
            message: 'Cannot include more than 1 copy of each attachment (by title)',
            condition: function condition(deck) {
                var allCards = deck.drawCards.concat(deck.plotCards);
                var attachmentNames = allCards.filter(function (cardQuantity) {
                    return cardQuantity.card.type === 'attachment';
                }).map(function (cardQuantity) {
                    return cardQuantity.card.name;
                });
                return attachmentNames.every(function (attachmentName) {
                    return getDeckCount(allCards.filter(function (cardQuantity) {
                        return cardQuantity.card.name === attachmentName;
                    })) <= 1;
                });
            }
        }]
    },
    // Dark Wings, Dark Words
    '16028': {
        requiredDraw: 75,
        rules: [{
            message: 'Cannot include more than 1 copy of each event (by title)',
            condition: function condition(deck) {
                var allCards = deck.drawCards.concat(deck.plotCards);
                var eventNames = allCards.filter(function (cardQuantity) {
                    return cardQuantity.card.type === 'event';
                }).map(function (cardQuantity) {
                    return cardQuantity.card.name;
                });
                return eventNames.every(function (eventName) {
                    return getDeckCount(allCards.filter(function (cardQuantity) {
                        return cardQuantity.card.name === eventName;
                    })) <= 1;
                });
            }
        }]
    },
    // The Long Voyage
    '16030': {
        requiredDraw: 100
    },
    // Kingdom of Shadows (Redesign)
    '17148': {
        mayInclude: function mayInclude(card) {
            return !card.loyal && hasKeyword(card, /Shadow \(\d+\)/);
        }
    },
    // Sea of Blood (Redesign)
    '17149': {
        cannotInclude: function cannotInclude(card) {
            return card.faction === 'neutral' && card.type === 'event';
        }
    },
    // The Free Folk (Redesign)
    '17150': {
        mayInclude: function mayInclude(card) {
            return card.faction !== 'neutral' && card.type === 'character' && !card.loyal && hasTrait(card, 'Wildling');
        },
        rules: [{
            message: 'Must only contain neutral cards or Non-loyal Wildling characters',
            condition: function condition(deck) {
                var drawDeckValid = !deck.drawCards.some(function (cardQuantity) {
                    return cardQuantity.card.faction !== 'neutral' && !(cardQuantity.card.type === 'character' && !cardQuantity.card.loyal && hasTrait(cardQuantity.card, 'Wildling'));
                });
                var plotDeckValid = !deck.plotCards.some(function (cardQuantity) {
                    return cardQuantity.card.faction !== 'neutral';
                });
                return drawDeckValid && plotDeckValid;
            }
        }]
    },
    // The Wars To Come (Redesign)
    '17151': {
        requiredPlots: 10,
        maxDoubledPlots: 2
    },
    // Valyrian Steel (Redesign)
    '17152': {
        requiredDraw: 75,
        rules: [{
            message: 'Cannot include more than 1 copy of each attachment',
            condition: function condition(deck) {
                var allCards = deck.drawCards.concat(deck.plotCards);
                var attachments = allCards.filter(function (cardQuantity) {
                    return cardQuantity.card.type === 'attachment';
                });
                return attachments.every(function (attachment) {
                    return attachment.count <= 1;
                });
            }
        }]
    },
    // Draft Agendas
    // The Power of Wealth
    '00001': rulesForDraft({
        mayInclude: function mayInclude() {
            return true;
        },
        rules: [{
            message: 'Cannot include cards from more than 1 outside faction',
            condition: function condition(deck) {
                var outOfFactionCards = deck.drawCards.concat(deck.plotCards).filter(function (cardQuantity) {
                    return cardQuantity.card.faction !== deck.faction.value && cardQuantity.card.faction !== 'neutral';
                });
                var factions = outOfFactionCards.map(function (cardQuantity) {
                    return cardQuantity.card.faction;
                });
                return factions.length <= 1;
            }
        }]
    }),
    // Protectors of the Realm
    '00002': rulesForDraft({
        mayInclude: function mayInclude(card) {
            return card.type === 'character' && (hasTrait(card, 'Knight') || hasTrait(card, 'Army'));
        }
    }),
    // Treaty
    '00003': rulesForDraft({
        mayInclude: function mayInclude() {
            return true;
        },
        rules: [{
            message: 'Cannot include cards from more than 2 outside factions',
            condition: function condition(deck) {
                var outOfFactionCards = deck.drawCards.concat(deck.plotCards).filter(function (cardQuantity) {
                    return cardQuantity.card.faction !== deck.faction.value && cardQuantity.card.faction !== 'neutral';
                });
                var factions = outOfFactionCards.map(function (cardQuantity) {
                    return cardQuantity.card.faction;
                });
                return factions.length <= 2;
            }
        }]
    }),
    // Uniting the Seven Kingdoms
    '00004': rulesForDraft({
        mayInclude: function mayInclude(card) {
            return card.type !== 'plot';
        }
    })
};

module.exports = agendaRules;