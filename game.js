// Game state
const gameState = {
    deck: [],
    hand: [],
    selectedCards: new Set(),
    discardCount: 2,
    player: {
        health: 50,
        shield: 0,
        pentacles: 0
    },
    enemies: [
        { health: 40, damage: 12 },
        { health: 50, damage: 15 }
    ],
    currentEnemyIndex: 0,
    isAnimating: false
};

// Game Configuration
const ANIMATION_CONFIG = {
    CARD_FLIGHT_DURATION: 500,
    ANIMATION_STAGGER: 200,
    CLEANUP_DURATION: 100,
    GLOW_DURATION: 300,
    IMPACT_DURATION: 200,
    ENEMY_TURN_DELAY: 700
};

// Constants
const suits = ['Swords', 'Cups', 'Pentacles', 'Wands'];
const values = [1, 2, 3, 4, 5];


// Card and Deck Management
function createDeck() {
    const deck = [];
    suits.forEach(suit => {
        values.forEach(value => {
            if (suit == "Cups") {
                if (value < 4) {
                    deck.push({ suit, value });
                }
            } else {
                deck.push({ suit, value });
            }
            
        });
    });

    specialCards.forEach(card => {
        deck.push({ ...card });
    });

    return deck;
}

function shuffleDeck(state) {
    for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
}

function drawCards(state, count) {
    for (let i = 0; i < count; i++) {
        if (state.deck.length > 0) {
            state.hand.push(state.deck.pop());
        }
    }
}

// Update the playSpecialCard function
async function playSpecialCard(state, index) {
    if (state.isAnimating) return;
    
    const card = state.hand[index];
    
    if (card.type === "special") {
        state.isAnimating = true;
        document.getElementById('play-hand-btn').disabled = true;
        
        try {
            // Call the card's effect function
            await card.effect(state, index);
            
            // Remove the card from hand
            state.hand = state.hand.filter((_, i) => i !== index);
            
            // Check if the game state has changed after applying the special card effect
            const gameStateChanged = await checkGameState(state);
            
            if (!gameStateChanged) {
                updateUI(state);
            }
        } finally {
            state.isAnimating = false;
            document.getElementById('play-hand-btn').disabled = false;
        }
    }
}


function createCardElement(card, index) {
    const div = document.createElement('div');
    
    if (card.type === "special") {
        div.className = `card special-card ${card.name.toLowerCase()}`;
        div.dataset.index = index;
        div.dataset.special = "true";
        
        div.innerHTML = `
            <div style="font-size: 20px; font-weight: bold;">${card.name}</div>
            <div style="font-size: 12px;">Special Card</div>
            <div class="card-description">${card.description}</div>
        `;
        
        div.addEventListener('click', () => playSpecialCard(gameState, index));
    } else {
        div.className = `card suit-${card.suit.toLowerCase()}`;
        div.dataset.index = index;
        
        div.innerHTML = `
            <div style="font-size: 24px; font-weight: bold;">${card.value}</div>
            <div style="font-size: 14px;">${card.suit}</div>
        `;
        
        div.addEventListener('click', () => toggleCardSelection(gameState, index));
    }
    
    return div;
}
function toggleCardSelection(state, index) {
    if (state.selectedCards.has(index)) {
        state.selectedCards.delete(index);
    } else {
        state.selectedCards.add(index);
    }
    
    updateUI(state);
}

// Game Logic - Discard and Hand Management
function discardSelected(state) {
    if (state.discardCount <= 0 || state.selectedCards.size === 0) return;
    
    const newHand = state.hand.filter((_, index) => !state.selectedCards.has(index));
    const discardedCount = state.selectedCards.size;
    
    state.hand = newHand;
    drawCards(state, 7-newHand.length);
    
    state.selectedCards.clear();
    state.discardCount--;
    
    updateUI(state);
}

function isHandStraight(cards) {
    if (cards.length !== 5) return false;
    
    const values = cards.map(card => card.value).sort((a, b) => a - b);
    
    for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i-1] + 1) {
            return false;
        }
    }
    
    return true;
}

function evaluateHand(cards) {
    if (cards.length === 0) {
        return { handType: 'No Cards', scoringCards: new Set(), multiplier: 1 };
    }
    
    const valueCounts = {};
    const suitCounts = {};
    
    cards.forEach(card => {
        valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });
    
    const values = Object.keys(valueCounts).map(Number).sort((a, b) => a - b);
    const maxCount = Math.max(...Object.values(valueCounts));
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    
    let isStraight = false
    isStraight = isHandStraight(cards);
    
    let handType = '';
    let scoringCards = new Set();
    let multiplier = 1;
    
    // Check for 5-card specific combinations first
    if (cards.length === 5) {
        if (maxSuitCount === 5 && isStraight) {
            handType = 'Straight Flush (x5)';
            multiplier = 5;
            for (let i = 0; i < cards.length; i++) {
                scoringCards.add(i);
            }
            return { handType, scoringCards, multiplier };
        }
        
        if (isStraight) {
            handType = 'Straight (x3)';
            multiplier = 3;
            for (let i = 0; i < cards.length; i++) {
                scoringCards.add(i);
            }
            return { handType, scoringCards, multiplier };
        }
        
        if (maxSuitCount === 5) {
            handType = 'Flush (x3)';
            multiplier = 3;
            for (let i = 0; i < cards.length; i++) {
                scoringCards.add(i);
            }
            return { handType, scoringCards, multiplier };
        }
    }
    
    // Now check for value-based combinations (works with any number of cards)
    if (maxCount === 5) {
        handType = 'Five of a Kind (x5)';
        multiplier = 5;
        scoringCards = getScoringCardsForValue(cards, valueCounts, 5);
    } else if (maxCount === 4) {
        handType = 'Four of a Kind (x4)';
        multiplier = 4;
        scoringCards = getScoringCardsForValue(cards, valueCounts, 4);
    } else if (maxCount === 3 && Object.values(valueCounts).includes(2)) {
        handType = 'Full House (x4)';
        multiplier = 4;
        scoringCards = getFullHouseScoringCards(cards, valueCounts);
    } else if (maxCount === 3) {
        handType = 'Three of a Kind (x3)';
        multiplier = 3;
        scoringCards = getScoringCardsForValue(cards, valueCounts, 3);
    } else if (Object.values(valueCounts).filter(count => count === 2).length === 2) {
        handType = 'Two Pair (x2)';
        multiplier = 2;
        scoringCards = getScoringCardsForValue(cards, valueCounts, 2);
    } else if (maxCount === 2) {
        handType = 'One Pair (x2)';
        multiplier = 2;
        scoringCards = getScoringCardsForValue(cards, valueCounts, 2);
    } else if (cards.length === 1) {
        handType = 'Single Card';
    } else {
        handType = 'High Card';
    }
    
    return { handType, scoringCards, multiplier };
}




// Helper functions for hand evaluation
function getScoringCardsForValue(cards, valueCounts, targetCount) {
    const scoringCards = new Set();
    Object.entries(valueCounts).forEach(([value, count]) => {
        if (count >= targetCount) {
            cards.forEach((card, index) => {
                if (card.value === parseInt(value)) {
                    scoringCards.add(index);
                }
            });
        }
    });
    return scoringCards;
}

function getFullHouseScoringCards(cards, valueCounts) {
    const scoringCards = new Set();
    Object.entries(valueCounts).forEach(([value, count]) => {
        if (count === 3 || count === 2) {
            cards.forEach((card, index) => {
                if (card.value === parseInt(value)) {
                    scoringCards.add(index);
                }
            });
        }
    });
    return scoringCards;
}

// Combat Effects Calculation
function calculateCombatEffects(cards, scoringCards, multiplier = 1) {
    let damage = 0;
    let shield = 0;
    let healing = 0;
    let pentacles = 0;
    
    cards.forEach((card, index) => {
        const cardMultiplier = scoringCards.has(index) ? multiplier : 1;
        const effectiveValue = card.value * cardMultiplier;
        
        switch (card.suit) {
            case 'Swords':
                damage += effectiveValue;
                break;
            case 'Wands':
                shield += effectiveValue;
                break;
            case 'Cups':
                healing += effectiveValue;
                break;
            case 'Pentacles':
                pentacles += effectiveValue;
                break;
        }
    });
    
    return { damage, shield, healing, pentacles };
}

function updateHandCalculator(state) {
    const selectedCards = Array.from(state.selectedCards).map(index => state.hand[index]);
    
    if (selectedCards.length > 0) {
        // Always calculate values based on currently selected cards
        let scoringCards = new Set();
        let multiplier = 1;
        
        // Only evaluate for poker hands if there are exactly 5 cards
        if (selectedCards.length > 0) {
            const handEvaluation = evaluateHand(selectedCards);
            scoringCards = handEvaluation.scoringCards;
            multiplier = handEvaluation.multiplier;
        }
        
        // Calculate effects based on current selection
        const effects = calculateCombatEffects(selectedCards, scoringCards, multiplier);
        
        // Update the calculator display
        document.getElementById('calc-swords').textContent = effects.damage;
        document.getElementById('calc-wands').textContent = effects.shield;
        document.getElementById('calc-cups').textContent = effects.healing;
        document.getElementById('calc-pentacles').textContent = effects.pentacles;
    } else {
        resetHandCalculatorUI();
    }
}

function resetHandCalculatorUI() {
    document.getElementById('calc-swords').textContent = 0;
    document.getElementById('calc-wands').textContent = 0;
    document.getElementById('calc-cups').textContent = 0;
    document.getElementById('calc-pentacles').textContent = 0;
}

// Animation Functions (keeping these larger since they need to be synchronized)
function getElementCenter(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function createImpactEffect(x, y) {
    const impact = document.createElement('div');
    impact.className = 'impact-effect';
    impact.style.left = `${x - 50}px`;
    impact.style.top = `${y - 50}px`;
    document.body.appendChild(impact);
    
    setTimeout(() => impact.remove(), ANIMATION_CONFIG.IMPACT_DURATION);
}

async function animateCard(card, cardElement, targetElement, effect, scoringCards, index, multiplier = 1) {
    const start = getElementCenter(cardElement);
    const end = getElementCenter(targetElement);
    
    const clone = cardElement.cloneNode(true);
    clone.className = `card suit-${card.suit.toLowerCase()} animating`;
    clone.style.left = `${start.x - 50}px`;
    clone.style.top = `${start.y - 75}px`;
    clone.style.zIndex = '1000';
    document.body.appendChild(clone);
    
    cardElement.style.opacity = '0';
    
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    const cardMultiplier = scoringCards.has(index) ? multiplier : 1;
    const effectiveValue = card.value * cardMultiplier;
    
    clone.style.left = `${end.x - 50}px`;
    clone.style.top = `${end.y - 75}px`;
    clone.style.transform = 'scale(0.1)';
    
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.CARD_FLIGHT_DURATION));
    
    switch (card.suit) {
        case 'Swords':
            createImpactEffect(end.x, end.y);
            clone.style.transform = 'scale(0.3) translateY(-50px)';
            clone.style.opacity = '0';
            break;
            
        case 'Wands':
            await applyGlowEffect(targetElement, 'glowing-blue', effect.shield);
            break;
            
        case 'Cups':
            await applyGlowEffect(targetElement, 'glowing-green', Math.min(effect.health + effect.healing, 50));
            break;
            
        case 'Pentacles':
            await applyGlowEffect(targetElement, 'glowing-red', effect.pentacles);
            break;
    }
    
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.CLEANUP_DURATION));
    clone.remove();
}

async function applyGlowEffect(element, className, newValue) {
    element.classList.add(className);
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.GLOW_DURATION));
    element.textContent = newValue;
    element.classList.remove(className);
}

async function animateCardEffects(state, selectedHand, scoringCards) {
    // Get the multiplier from evaluateHand
    const { multiplier } = evaluateHand(selectedHand);
    
    const effects = calculateCombatEffects(selectedHand, scoringCards, multiplier);
    
    const runningEffects = {
        health: state.player.health,
        shield: 0,
        pentacles: state.player.pentacles
    };

    const animationPromises = [];
    
    // Get the card elements we need to animate
    const cardElements = document.querySelectorAll('.card');
    const selectedCardIndices = Array.from(state.selectedCards);
    
    for (let i = 0; i < selectedHand.length; i++) {
        const card = selectedHand[i];
        const index = selectedCardIndices[i];
        const cardElement = cardElements[index];
        
        const targetElement = getTargetElement(card.suit);
        
        if (cardElement && targetElement) {
            updateRunningEffects(runningEffects, card, scoringCards.has(i), multiplier);
            
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.ANIMATION_STAGGER));
            }
            
            const animationPromise = animateCard(card, cardElement, targetElement, runningEffects, scoringCards, i, multiplier);
            animationPromises.push(animationPromise);
        }  
    }
    await Promise.all(animationPromises);
    
    return effects;
}

function getTargetElement(suit) {
    switch (suit) {
        case 'Swords':
            return document.querySelector('.enemy-area');
        case 'Wands':
            return document.getElementById('player-shield');
        case 'Cups':
            return document.getElementById('player-health');
        case 'Pentacles':
            return document.getElementById('player-pentacles');
    }
}

function updateRunningEffects(runningEffects, card, isScoring, multiplier = 1) {
    const cardMultiplier = isScoring ? multiplier : 1;
    const effectiveValue = card.value * cardMultiplier;
    
    switch (card.suit) {
        case 'Wands':
            runningEffects.shield += effectiveValue;
            break;
        case 'Cups':
            runningEffects.health = Math.min(runningEffects.health + effectiveValue, 50);
            break;
        case 'Pentacles':
            runningEffects.pentacles += effectiveValue;
            break;
    }
}

// Enemy Attack Animation (keeping as one function for smooth animation)
async function animateEnemyAttack(state, enemyDamage, shieldValue) {
    const enemyArea = document.querySelector('.enemy-area');
    const shieldElement = document.getElementById('player-shield');
    const healthElement = document.getElementById('player-health');
    
    const enemyCenter = getElementCenter(enemyArea);
    
    const damageElement = document.createElement('div');
    damageElement.className = 'enemy-damage';
    damageElement.textContent = enemyDamage;
    damageElement.style.left = `${enemyCenter.x - 30}px`;
    damageElement.style.top = `${enemyCenter.y - 30}px`;
    document.body.appendChild(damageElement);
    
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    if (shieldValue > 0) {
        await animateDamageToShield(damageElement, shieldElement, enemyDamage, shieldValue);
        const remainingDamage = Math.max(0, enemyDamage - shieldValue);
        
        if (remainingDamage > 0) {
            damageElement.textContent = remainingDamage;
            await animateDamageToHealth(damageElement, healthElement);
        }
    } else {
        await animateDamageToHealth(damageElement, healthElement);
    }
    
    damageElement.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 200));
    damageElement.remove();
}

async function animateDamageToShield(damageElement, shieldElement, enemyDamage, shieldValue) {
    const shieldCenter = getElementCenter(shieldElement);
    damageElement.style.left = `${shieldCenter.x - 30}px`;
    damageElement.style.top = `${shieldCenter.y - 30}px`;
    
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.CARD_FLIGHT_DURATION));
    
    shieldElement.classList.add('hit');
    await new Promise(resolve => setTimeout(resolve, 300));
    shieldElement.classList.remove('hit');
}

async function animateDamageToHealth(damageElement, healthElement) {
    const healthCenter = getElementCenter(healthElement);
    damageElement.style.left = `${healthCenter.x - 30}px`;
    damageElement.style.top = `${healthCenter.y - 30}px`;
    
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.CARD_FLIGHT_DURATION));
    
    healthElement.classList.add('hit');
    await new Promise(resolve => setTimeout(resolve, 300));
    healthElement.classList.remove('hit');
}

// endTurn
async function playHand(state) {
    if (state.isAnimating) return;
    
    // Check if any cards are selected
    if (state.selectedCards.size === 0) {
        alert('Please select at least 1 card to play.');
        return;
    }
    
    // Check if more than 5 cards are selected
    if (state.selectedCards.size > 5) {
        alert('You can only play up to 5 cards at a time.');
        return;
    }
    
    try {
        state.isAnimating = true;
        document.getElementById('play-hand-btn').disabled = true;
        
        // Get cards that were selected
        const selectedCards = Array.from(state.selectedCards).map(index => state.hand[index]);
        
        // Evaluate the hand
        const { handType, scoringCards, multiplier } = evaluateHand(selectedCards);
        
        // Animate card effects
        const effects = await animateCardEffects(state, selectedCards, scoringCards);
        
        // Apply player effects
        applyPlayerEffects(state, effects);
        
        // Remove played cards from hand
        state.hand = state.hand.filter((_, index) => !state.selectedCards.has(index));
        state.selectedCards.clear();
        
        // Enemy turn
        await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.ENEMY_TURN_DELAY));
        await animateEnemyAttack(state, state.enemies[state.currentEnemyIndex].damage, state.player.shield);
        
        applyEnemyDamage(state);
        
        await handleRoundEnd(state);
    } finally {
        state.isAnimating = false;
        document.getElementById('play-hand-btn').disabled = false;
    }
}

function applyPlayerEffects(state, effects) {
    const currentEnemy = state.enemies[state.currentEnemyIndex];
    currentEnemy.health -= effects.damage;
    state.player.shield = effects.shield;
    state.player.health = Math.min(state.player.health + effects.healing, 50);
    state.player.pentacles += effects.pentacles;
    
    updateCombatStatsUI(state);
}

function applyEnemyDamage(state) {
    const currentEnemy = state.enemies[state.currentEnemyIndex];
    const actualDamage = Math.max(0, currentEnemy.damage - state.player.shield);
    state.player.health -= actualDamage;
    state.player.shield = 0;
    
    updateCombatStatsUI(state);
}

async function checkGameState(state) {
    const currentEnemy = state.enemies[state.currentEnemyIndex];
    
    if (currentEnemy.health <= 0) {
        await handleEnemyDefeat(state);
        return true; // Game state changed (enemy defeated)
    } else if (state.player.health <= 0) {
        await handlePlayerDefeat(state);
        return true; // Game state changed (player defeated)
    }
    
    return false; // Game continues normally
}

async function handleRoundEnd(state) {
    console.log("round ended; current hand length is " + state.hand.length)
    
    const gameStateChanged = await checkGameState(state);
    if (gameStateChanged) return;
    
    if (state.hand.length < 7) {
        drawCards(state, (7-state.hand.length));
        state.discardCount = 2; 
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    updateUI(state);
}

async function handleEnemyDefeat(state) {
    state.currentEnemyIndex++;
    if (state.currentEnemyIndex < state.enemies.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
        alert('You defeated the enemy! Next battle!');
        // Clear hand and start fresh
        state.hand = [];
        state.selectedCards.clear();
        state.discardCount = 2;
        drawCards(state, 7);
        updateUI(state);
    } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        alert('You won! All enemies have been defeated!');
        resetGameState(state);
    }
}

async function handlePlayerDefeat(state) {
    await new Promise(resolve => setTimeout(resolve, 500));
    alert('You lost! Try again.');
    resetGameState(state);
}

function resetGameState(state) {
    state.currentEnemyIndex = 0;
    state.enemies.forEach(enemy => {
        enemy.health = enemy.damage === 6 ? 30 : 35;
    });
    state.player.health = 50;
    state.player.pentacles = 0;
    initGame(state);
}

// UI Update Functions
function updateUI(state) {
    updateEnemyUI(state);
    updatePlayerStatsUI(state);
    updateDeckUI(state);
    updateCardsContainerUI(state);
    updateHandValueUI(state);
    updateButtonsUI(state);
    updateHandCalculator(state);
}

function updateEnemyUI(state) {
    const currentEnemy = state.enemies[state.currentEnemyIndex];
    document.getElementById('enemy-health').textContent = currentEnemy.health;
    document.getElementById('enemy-damage').textContent = currentEnemy.damage;
}

function updatePlayerStatsUI(state) {
    document.getElementById('player-health').textContent = state.player.health;
    document.getElementById('player-shield').textContent = state.player.shield;
    document.getElementById('player-pentacles').textContent = state.player.pentacles;
}

function updateDeckUI(state) {
    document.getElementById('deck-count').textContent = state.deck.length;
}

function updateCardsContainerUI(state) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    state.hand.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        if (state.selectedCards.has(index)) {
            cardElement.classList.add('selected');
        }
        container.appendChild(cardElement);
    });
}

function updateHandValueUI(state) {
    const handValueElement = document.getElementById('hand-value');
    
    if (state.selectedCards.size > 0 && state.selectedCards.size <= 5) {
        const selectedCards = Array.from(state.selectedCards).map(index => state.hand[index]);
        if (selectedCards.length > 0) {
            const { handType } = evaluateHand(selectedCards);
            handValueElement.textContent = `Hand: ${handType}`;
        }
    } else {
        handValueElement.textContent = 'Select up to 5 cards to play or discard';
    }
}

function updateButtonsUI(state) {
    document.getElementById('discard-count').textContent = state.discardCount;
    
    const discardBtn = document.getElementById('discard-btn');
    const playHandBtn = document.getElementById('play-hand-btn');
    
    // Discard button is enabled if there are discards left and cards selected
    discardBtn.disabled = state.discardCount === 0 || state.selectedCards.size === 0;
    
    // Play Hand button is enabled if 1-5 cards are selected
    playHandBtn.disabled = state.selectedCards.size === 0 || state.selectedCards.size > 5;
}

function updateCombatStatsUI(state) {
    document.getElementById('enemy-health').textContent = state.enemies[state.currentEnemyIndex].health;
    document.getElementById('player-health').textContent = state.player.health;
    document.getElementById('player-shield').textContent = state.player.shield;
    document.getElementById('player-pentacles').textContent = state.player.pentacles;
}

// Game Initialization
function initGame(state) {
    state.deck = createDeck();
    shuffleDeck(state);
    state.hand = [];
    state.selectedCards.clear();
    state.discardCount = 2;
    state.player.shield = 0;
    drawCards(state, 7);
    updateUI(state);
}

// Event listeners
document.getElementById('discard-btn').addEventListener('click', () => discardSelected(gameState));
document.getElementById('play-hand-btn').addEventListener('click', () => playHand(gameState));
document.addEventListener('DOMContentLoaded', applyAnimationTimings);

// Apply animation timings
function applyAnimationTimings() {
    const style = document.createElement('style');
    style.innerHTML = `
        .card.animating {
            transition: all ${ANIMATION_CONFIG.CARD_FLIGHT_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1);
        }
    `;
    document.head.appendChild(style);
}

// Start the game
initGame(gameState);



//
// Add after the animation functions
async function animateDeathCard(state, index) {
    const card = state.hand[index];
    const cardElement = document.querySelectorAll('.card')[index];
    const hasSufficientPentacles = state.player.pentacles >= card.cost;
    
    // Get target based on effect
    const targetElement = hasSufficientPentacles 
        ? document.querySelector('.enemy-area')
        : document.getElementById('player-pentacles');
    
    const start = getElementCenter(cardElement);
    const end = getElementCenter(targetElement);
    
    const clone = cardElement.cloneNode(true);
    clone.className = `card special-card death animating`;
    clone.style.left = `${start.x - 50}px`;
    clone.style.top = `${start.y - 75}px`;
    clone.style.zIndex = '1000';
    document.body.appendChild(clone);
    
    cardElement.style.opacity = '0';
    
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    clone.style.left = `${end.x - 50}px`;
    clone.style.top = `${end.y - 75}px`;
    clone.style.transform = 'scale(0.1)';
    
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.CARD_FLIGHT_DURATION));
    
    if (hasSufficientPentacles) {
        // Death effect - deal 25 damage
        state.enemies[state.currentEnemyIndex].health -= 25;
        state.player.pentacles -= card.cost;
        createImpactEffect(end.x, end.y);
        
        // Create damage number
        const damageElement = document.createElement('div');
        damageElement.className = 'enemy-damage';
        damageElement.textContent = "25";
        damageElement.style.left = `${end.x - 30}px`;
        damageElement.style.top = `${end.y - 30}px`;
        document.body.appendChild(damageElement);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        damageElement.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 200));
        damageElement.remove();
    } else {
        // Give player 3 pentacles
        state.player.pentacles += 3;
        await applyGlowEffect(targetElement, 'glowing-red', state.player.pentacles);
    }
    
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.CLEANUP_DURATION));
    clone.remove();
    
    updateCombatStatsUI(state);
}


