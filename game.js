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
        { health: 30, damage: 6 },
        { health: 35, damage: 8 }
    ],
    currentEnemyIndex: 0,
    selectingFinalHand: false,

    isAnimating: false
};

const ANIMATION_CONFIG = {
    CARD_FLIGHT_DURATION: 500,    // How long each card takes to reach its target
    ANIMATION_STAGGER: 200,       // Delay between starting each card animation
    CLEANUP_DURATION: 100,        // Time for cleanup after reaching target
    GLOW_DURATION: 300,          // Duration of the glow effect
    IMPACT_DURATION: 200,        // Duration of the impact effect
    ENEMY_TURN_DELAY: 700        // Delay before enemy attacks
};

// Card suits and values
const suits = ['Swords', 'Cups', 'Pentacles', 'Wands'];
const values = [1, 2, 3, 4, 5];

// Create a new deck
function createDeck() {
    const deck = [];
    suits.forEach(suit => {
        values.forEach(value => {
            deck.push({ suit, value });
        });
    });
    return deck;
}

// Initialize the game
function initGame(state) {
    state.deck = createDeck();
    shuffleDeck(state);
    state.hand = [];
    state.selectedCards.clear();
    state.discardCount = 2;
    state.player.shield = 0;
    drawCards(state, 5);
    updateUI(state);
}

// Shuffle the deck
function shuffleDeck(state) {
    for (let i = state.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
    }
}

// Draw cards from deck
function drawCards(state, count) {
    for (let i = 0; i < count; i++) {
        if (state.deck.length > 0) {
            state.hand.push(state.deck.pop());
        }
    }
}

// Create card HTML element
function createCardElement(card, index) {
    const div = document.createElement('div');
    div.className = `card suit-${card.suit.toLowerCase()}`;
    div.dataset.index = index;
    
    div.innerHTML = `
        <div style="font-size: 24px; font-weight: bold;">${card.value}</div>
        <div style="font-size: 14px;">${card.suit}</div>
    `;
    
    div.addEventListener('click', () => toggleCardSelection(gameState, index));
    
    return div;
}

// Toggle card selection
function toggleCardSelection(state, index) {
    if (state.selectingFinalHand && state.selectedCards.size >= 5 && !state.selectedCards.has(index)) {
        return; // Don't allow selecting more than 5 cards for final hand
    }
    
    if (state.selectedCards.has(index)) {
        state.selectedCards.delete(index);
    } else {
        state.selectedCards.add(index);
    }
    
    updateUI(state);
}

// Discard selected cards
function discardSelected(state) {
    if (state.discardCount <= 0 || state.selectedCards.size === 0) return;
    
    // Remove selected cards from hand
    const newHand = state.hand.filter((_, index) => !state.selectedCards.has(index));
    const discardedCount = state.selectedCards.size;
    
    // Draw new cards
    state.hand = newHand;
    drawCards(state, discardedCount);
    
    // Clear selected cards and update discard count
    state.selectedCards.clear();
    state.discardCount--;
    
    updateUI(state);
}

// Evaluate poker hand
function evaluateHand(cards) {
    // Count values
    const valueCounts = {};
    cards.forEach(card => {
        valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
    });
    
    // Count suits
    const suitCounts = {};
    cards.forEach(card => {
        suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });
    
    // Check for patterns
    const values = Object.keys(valueCounts).map(Number).sort((a, b) => a - b);
    const maxCount = Math.max(...Object.values(valueCounts));
    const maxSuitCount = Math.max(...Object.values(suitCounts));
    
    // Check for straight
    let isStraight = false;
    if (values.length === 5) {
        isStraight = values[values.length - 1] - values[0] === 4;
    }
    
    // Determine hand type and scoring cards
    let handType = '';
    let scoringCards = new Set();
    
    if (maxCount === 5) {
        handType = 'Five of a Kind';
        Object.entries(valueCounts).forEach(([value, count]) => {
            if (count === 5) {
                cards.forEach((card, index) => {
                    if (card.value === parseInt(value)) {
                        scoringCards.add(index);
                    }
                });
            }
        });
    } else if (maxCount === 4) {
        handType = 'Four of a Kind';
        Object.entries(valueCounts).forEach(([value, count]) => {
            if (count === 4) {
                cards.forEach((card, index) => {
                    if (card.value === parseInt(value)) {
                        scoringCards.add(index);
                    }
                });
            }
        });
    } else if (maxCount === 3 && Object.values(valueCounts).includes(2)) {
        handType = 'Full House';
        Object.entries(valueCounts).forEach(([value, count]) => {
            if (count === 3 || count === 2) {
                cards.forEach((card, index) => {
                    if (card.value === parseInt(value)) {
                        scoringCards.add(index);
                    }
                });
            }
        });
    } else if (maxSuitCount === 5) {
        if (isStraight) {
            handType = 'Straight Flush';
            cards.forEach((_, index) => scoringCards.add(index));
        } else {
            handType = 'Flush';
            cards.forEach((_, index) => scoringCards.add(index));
        }
    } else if (isStraight) {
        handType = 'Straight';
        cards.forEach((_, index) => scoringCards.add(index));
    } else if (maxCount === 3) {
        handType = 'Three of a Kind';
        Object.entries(valueCounts).forEach(([value, count]) => {
            if (count === 3) {
                cards.forEach((card, index) => {
                    if (card.value === parseInt(value)) {
                        scoringCards.add(index);
                    }
                });
            }
        });
    } else if (Object.values(valueCounts).filter(count => count === 2).length === 2) {
        handType = 'Two Pair';
        Object.entries(valueCounts).forEach(([value, count]) => {
            if (count === 2) {
                cards.forEach((card, index) => {
                    if (card.value === parseInt(value)) {
                        scoringCards.add(index);
                    }
                });
            }
        });
    } else if (maxCount === 2) {
        handType = 'One Pair';
        Object.entries(valueCounts).forEach(([value, count]) => {
            if (count === 2) {
                cards.forEach((card, index) => {
                    if (card.value === parseInt(value)) {
                        scoringCards.add(index);
                    }
                });
            }
        });
    } else {
        handType = 'High Card';
    }
    
    return { handType, scoringCards };
}

// Calculate combat effects
function calculateCombatEffects(cards, scoringCards) {
    let damage = 0;
    let shield = 0;
    let healing = 0;
    let pentacles = 0;
    
    cards.forEach((card, index) => {
        const multiplier = scoringCards.has(index) ? 2 : 1;
        const effectiveValue = card.value * multiplier;
        
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

// Calculate and display current hand values
function updateHandCalculator(state) {
    if (state.hand.length >= 5) {
        const previewHand = state.hand.slice(0, 5);
        const { scoringCards } = evaluateHand(previewHand);
        const effects = calculateCombatEffects(previewHand, scoringCards);
        
        document.getElementById('calc-swords').textContent = effects.damage;
        document.getElementById('calc-wands').textContent = effects.shield;
        document.getElementById('calc-cups').textContent = effects.healing;
        document.getElementById('calc-pentacles').textContent = effects.pentacles;
    } else {
        document.getElementById('calc-swords').textContent = 0;
        document.getElementById('calc-wands').textContent = 0;
        document.getElementById('calc-cups').textContent = 0;
        document.getElementById('calc-pentacles').textContent = 0;
    }
}


// Add animation functions after calculateCombatEffects

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

async function animateCard(card, cardElement, targetElement, effect, scoringCards, index) {
    const start = getElementCenter(cardElement);
    const end = getElementCenter(targetElement);
    
    const clone = cardElement.cloneNode(true);
    clone.className = `card suit-${card.suit.toLowerCase()} animating`;
    clone.style.left = `${start.x - 50}px`;
    clone.style.top = `${start.y - 75}px`;
    clone.style.zIndex = '1000';
    document.body.appendChild(clone);
    
    cardElement.style.opacity = '0';
    
    // Wait a frame for the initial position to take effect
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    const multiplier = scoringCards.has(index) ? 2 : 1;
    const effectiveValue = card.value * multiplier;
    
    // Animate to target
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
            targetElement.classList.add('glowing-blue');
            await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.GLOW_DURATION));
            targetElement.textContent = effect.shield;
            targetElement.classList.remove('glowing-blue');
            break;
            
        case 'Cups':
            targetElement.classList.add('glowing-green');
            await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.GLOW_DURATION));
            targetElement.textContent = Math.min(effect.health + effect.healing, 50);
            targetElement.classList.remove('glowing-green');
            break;
            
        case 'Pentacles':
            targetElement.classList.add('glowing-red');
            await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.GLOW_DURATION));
            targetElement.textContent = effect.pentacles;
            targetElement.classList.remove('glowing-red');
            break;
    }
    
    // Clean up
    await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.CLEANUP_DURATION));
    clone.remove();
}

async function animateCardEffects(state, selectedHand, scoringCards) {
    const effects = calculateCombatEffects(selectedHand, scoringCards);
    
    // Initialize effect counters
    const runningEffects = {
        health: state.player.health,
        shield: 0,
        pentacles: state.player.pentacles
    };

    // Animate all cards simultaneously
    const animationPromises = [];
    
    for (let i = 0; i < selectedHand.length; i++) {
        const card = selectedHand[i];
        const cardElements = document.querySelectorAll('.card');
        const cardIndex = state.hand.indexOf(card);
        const cardElement = cardElements[cardIndex];
        
        let targetElement;
        
        switch (card.suit) {
            case 'Swords':
                targetElement = document.querySelector('.enemy-area');
                break;
            case 'Wands':
                targetElement = document.getElementById('player-shield');
                break;
            case 'Cups':
                targetElement = document.getElementById('player-health');
                break;
            case 'Pentacles':
                targetElement = document.getElementById('player-pentacles');
                break;
        }
        
        if (cardElement && targetElement) {
            const multiplier = scoringCards.has(i) ? 2 : 1;
            const effectiveValue = card.value * multiplier;
            
            // Update running effect counters
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

            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, ANIMATION_CONFIG.ANIMATION_STAGGER));
            }
            
            const animationPromise = animateCard(card, cardElement, targetElement, runningEffects, scoringCards, i);
            animationPromises.push(animationPromise);
        }  
    }
    await Promise.all(animationPromises);
    
    return effects;
}

// End turn and resolve combat
async function endTurn(state) {
    if (state.isAnimating) {
        return;
    }

    if (state.hand.length > 5) {
        // Need to select 5 cards
        state.selectingFinalHand = true;
        document.getElementById('select-hand-modal').style.display = 'flex';
        updateUI(state);
        return;
    }
    
    const selectedHand = state.hand.filter((_, index) => 
        state.hand.length === 5 || state.selectedCards.has(index)
    );
    
    if (selectedHand.length !== 5) {
        alert('Please select exactly 5 cards to end your turn.');
        return;
    }
    
    try {
        // Evaluate hand
        const { handType, scoringCards } = evaluateHand(selectedHand);
        
        // Animate card effects
        const effects = await animateCardEffects(state, selectedHand, scoringCards);
        
        // Apply effects
        const currentEnemy = state.enemies[state.currentEnemyIndex];
        currentEnemy.health -= effects.damage;
        state.player.shield = effects.shield;
        state.player.health = Math.min(state.player.health + effects.healing, 50);
        state.player.pentacles += effects.pentacles;
        
        // Update UI for final states
        document.getElementById('enemy-health').textContent = currentEnemy.health;
        document.getElementById('player-health').textContent = state.player.health;
        document.getElementById('player-shield').textContent = state.player.shield;
        document.getElementById('player-pentacles').textContent = state.player.pentacles;
        
        // Enemy turn
        await new Promise(resolve => setTimeout(resolve, 500));
        const actualDamage = Math.max(0, currentEnemy.damage - state.player.shield);
        state.player.health -= actualDamage;
        state.player.shield = 0;  // Reset shield after enemy attack
        
        // Update UI after enemy attack
        document.getElementById('player-health').textContent = state.player.health;
        document.getElementById('player-shield').textContent = state.player.shield;
        
        // Check win/lose conditions
        if (currentEnemy.health <= 0) {
            state.currentEnemyIndex++;
            if (state.currentEnemyIndex < state.enemies.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
                alert('You defeated the enemy! Next battle!');
                initGame(state);
            } else {
                await new Promise(resolve => setTimeout(resolve, 500));
                alert('You won! All enemies have been defeated!');
                state.currentEnemyIndex = 0;
                state.enemies.forEach(enemy => {
                    enemy.health = enemy.damage === 6 ? 30 : 35;
                });
                initGame(state);
            }
        } else if (state.player.health <= 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            alert('You lost! Try again.');
            state.currentEnemyIndex = 0;
            state.enemies.forEach(enemy => {
                enemy.health = enemy.damage === 6 ? 30 : 35;
            });
            state.player.health = 50;
            state.player.pentacles = 0;
            initGame(state);
        } else {
            // Reset for next round
            await new Promise(resolve => setTimeout(resolve, 500));
            initGame(state);
        }
    }  finally {
        // Always reset animation flag and re-enable button
        state.isAnimating = false;
        document.getElementById('end-turn-btn').disabled = false;
    }
}

// Update UI
function updateUI(state) {
    const currentEnemy = state.enemies[state.currentEnemyIndex];
    
    // Update enemy stats
    document.getElementById('enemy-health').textContent = currentEnemy.health;
    document.getElementById('enemy-damage').textContent = currentEnemy.damage;
    
    // Update player stats
    document.getElementById('player-health').textContent = state.player.health;
    document.getElementById('player-shield').textContent = state.player.shield;
    document.getElementById('player-pentacles').textContent = state.player.pentacles;
    
    // Update deck count
    document.getElementById('deck-count').textContent = state.deck.length;
    
    // Update cards container
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    state.hand.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        if (state.selectedCards.has(index)) {
            cardElement.classList.add('selected');
        }
        container.appendChild(cardElement);
    });
    
    // Update hand value if there are selected cards
    const handValueElement = document.getElementById('hand-value');
    if (state.selectedCards.size > 0) {
        const selectedHand = state.hand.filter((_, index) => state.selectedCards.has(index));
        if (selectedHand.length === 5) {
            const { handType } = evaluateHand(selectedHand);
            handValueElement.textContent = `Hand: ${handType}`;
        } else {
            handValueElement.textContent = `Select 5 cards for a hand`;
        }
    } else if (state.hand.length === 5) {
        const { handType } = evaluateHand(state.hand);
        handValueElement.textContent = `Hand: ${handType}`;
    } else {
        handValueElement.textContent = '';
    }
    
    // Update buttons
    document.getElementById('discard-count').textContent = state.discardCount;
    // Only disable buttons if animation is in progress or conditions not met
    const discardBtn = document.getElementById('discard-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    
    if (!endTurnBtn.disabled) {  // Only update if not currently animating
        discardBtn.disabled = state.discardCount === 0 || state.selectedCards.size === 0;
    }

    // Update confirm button in modal
    if (state.selectingFinalHand) {
        document.getElementById('confirm-hand-btn').disabled = state.selectedCards.size !== 5;
    }
    
    // Update hand calculator
    updateHandCalculator(state);
}

// Confirm final hand selection
function confirmHandSelection(state) {
    if (state.selectedCards.size !== 5) return;
    
    // Close modal
    document.getElementById('select-hand-modal').style.display = 'none';
    state.selectingFinalHand = false;
    
    // Process end turn with selected cards
    endTurn(state);
}

// Event listeners
document.getElementById('discard-btn').addEventListener('click', () => discardSelected(gameState));
document.getElementById('end-turn-btn').addEventListener('click', () => endTurn(gameState));
document.getElementById('confirm-hand-btn').addEventListener('click', () => confirmHandSelection(gameState));

// Start the game
initGame(gameState);


//CSS TIMINGS
// Apply CSS timing from our config
function applyAnimationTimings() {
    const style = document.createElement('style');
    style.innerHTML = `
        .card.animating {
            transition: all ${ANIMATION_CONFIG.CARD_FLIGHT_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1);
        }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', applyAnimationTimings);