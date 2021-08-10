const moment = require('moment');

const RestrictedList = require('./RestrictedList');

function getDeckCounts(deck) {
    let count = {
        drawCount: 0,
        jokerCount: 0,
        startingCount: 0,
        startingCost: 0
    };

    for(const cardEntry of deck) {
        if(cardEntry.card.type_code === 'joker') {
            count.jokerCount += cardEntry.count;
            continue;
        }
        if(cardEntry.starting) {
            var startingCount = cardEntry.starting;
            // Xiaodan Li - does not count towards limit
            if(cardEntry.card.code === '09006') {
                startingCount = 0;
            }
            // Harvester - counts as 3 dudes
            if(cardEntry.card.code === '16005') {
                startingCount = cardEntry.starting * 3;
            }
            var keywords = getKeywords(cardEntry.card);
            if(keywords.find(keyword => keyword === 'core')) {
                count.startingCoreCount += startingCount;
            }
            count.startingCount += startingCount;
            count.startingCost += cardEntry.card.cost * cardEntry.starting;
        }
        count.drawCount += cardEntry.count;
    }

    return count;
}

function getKeywords(card) {
    var keywordArray = card.keywords.split('\u2022');
    return keywordArray.map(keyword => keyword.trim().toLowerCase());
}

function isCardInReleasedPack(packs, card) {
    let pack = packs.find(pack => {
        return card.pack_code === pack.code;
    });

    if(!pack) {
        return false;
    }

    let releaseDate = pack.available || pack.date_release;

    if(!releaseDate) {
        return false;
    }

    releaseDate = moment(releaseDate, 'YYYY-MM-DD');
    let now = moment();

    return releaseDate <= now;
}

const legendRules = {};

class DeckValidator {
    constructor(packs, restrictedListRules) {
        this.packs = packs;
        this.restrictedLists = restrictedListRules.map(rl => new RestrictedList(rl));
    }

    validateDeck(deck) {
        let errors = [];
        let unreleasedCards = [];
        let rules = this.getRules(deck);
        let { drawCount, jokerCount, startingCount, startingCoreCount, startingCost } = getDeckCounts(deck.drawCards);

        if(drawCount !== rules.requiredDraw) {
            errors.push(drawCount + ' cards with printed value (required 52)');
        }
        if(jokerCount > rules.maxJokerCount) {
            errors.push('Too many Joker cards');
        }
        if(this.restrictedLists[0].rules.cardSet === 'new') {
            if(startingCount > rules.maxStartingCount + rules.maxStartingCoreCount) {
                errors.push('Too many cards in starting posse');
            }
        } else {
            if(startingCount > rules.maxStartingCount) {
                errors.push('Too many cards in starting posse');
            }            
        }
        if(startingCoreCount > rules.maxStartingCoreCount) {
            errors.push('Too many Core deeds in starting posse');
        }
        if(deck.outfit && startingCost > deck.outfit.wealth) {
            errors.push('Negative starting Ghost Rock');
        }

        for(const rule of rules.rules) {
            if(!rule.condition(deck)) {
                errors.push(rule.message);
            }
        }

        let allCards = deck.drawCards;
        let cardCountByValue = {};

        for(let cardQuantity of allCards) {
            cardCountByValue[cardQuantity.card.value] = cardCountByValue[cardQuantity.card.value] || { value: cardQuantity.card.value, count: 0 };
            cardCountByValue[cardQuantity.card.value].count += cardQuantity.count;
            if(!isCardInReleasedPack(this.packs, cardQuantity.card)) {
                unreleasedCards.push(cardQuantity.card.title + ' is not yet released');
            }
            if(cardQuantity.count < cardQuantity.starting) {
                errors.push('Starting count for a card ' + cardQuantity.card.title + ' is greater than its count');
            }
            if(cardQuantity.starting) {
                var keywords = getKeywords(cardQuantity.card);
                if(cardQuantity.starting > 1 && !keywords.find(keyword => keyword === 'non-unique')) {
                    errors.push('Starting multiple copies of unique card ' + cardQuantity.card.title);
                }
                if(cardQuantity.card.type_code === 'deed' && !keywords.find(keyword => keyword === 'core')) {
                    errors.push('Starting non-core deed ' + cardQuantity.card.title);
                }
            }
        }

        for(const card of Object.values(cardCountByValue)) {
            if(card.count > 4) {
                errors.push('Too many cards with same value: ' + card.value);
            }
        }

        let uniqueCards = allCards.map(cardQuantity => cardQuantity.card);
        let restrictedListResults = this.restrictedLists.map(restrictedList => restrictedList.validate(uniqueCards));
        let officialRestrictedResult = restrictedListResults[0];

        const restrictedListErrors = restrictedListResults.reduce((errors, result) => errors.concat(result.errors), []);

        return {
            basicRules: errors.length === 0,
            restrictedRules: officialRestrictedResult.restrictedRules,
            noBannedCards: officialRestrictedResult.noBannedCards,
            restrictedLists: restrictedListResults,
            noUnreleasedCards: true,
            drawCount: drawCount,
            extendedStatus: 
			errors.concat(unreleasedCards).concat(restrictedListErrors)	
        };
    }

    getRules(deck) {
        const standardRules = {
            requiredDraw: 52,
            maxJokerCount: 2,
            maxStartingCount: 5,
            maxStartingCoreCount: 1
        };
        let outfitRules = this.getOutfitRules();
        let legendRules = this.getLegendRules(deck);
        return this.combineValidationRules([standardRules, outfitRules].concat(legendRules));
    }

    getOutfitRules() {
        //No inclusion restrictions for outfit as of TCaR
        return [];
    }

    getLegendRules(deck) {
        if(!deck.legend) {
            return [];
        }

        let allLegends = [];
        return allLegends.map(legend => legendRules[legend.code]);
    }

    combineValidationRules(validators) {
        let mayIncludeFuncs = validators.map(validator => validator.mayInclude).filter(v => !!v);
        let cannotIncludeFuncs = validators.map(validator => validator.cannotInclude).filter(v => !!v);
        let combinedRules = validators.reduce((rules, validator) => rules.concat(validator.rules || []), []);
        let combined = {
            mayInclude: card => mayIncludeFuncs.some(func => func(card)),
            cannotInclude: card => cannotIncludeFuncs.some(func => func(card)),
            rules: combinedRules
        };

        return Object.assign({}, ...validators, combined);
    }

}

module.exports = DeckValidator;
