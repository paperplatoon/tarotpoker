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
    selectingFinalHand: false
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

// End turn and resolve combat
function endTurn(state) {
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
    
    // Evaluate hand and calculate effects
    const { handType, scoringCards } = evaluateHand(selectedHand);
    const effects = calculateCombatEffects(selectedHand, scoringCards);
    
    // Apply effects
    const currentEnemy = state.enemies[state.currentEnemyIndex];
    currentEnemy.health -= effects.damage;
    state.player.shield = effects.shield;
    state.player.health = Math.min(state.player.health + effects.healing, 50);
    state.player.pentacles += effects.pentacles;
    
    // Enemy turn
    const actualDamage = Math.max(0, currentEnemy.damage - state.player.shield);
    state.player.health -= actualDamage;
    
    // Check win/lose conditions
    if (currentEnemy.health <= 0) {
        state.currentEnemyIndex++;
        if (state.currentEnemyIndex < state.enemies.length) {
            alert('You defeated the enemy! Next battle!');
            initGame(state);
        } else {
            alert('You won! All enemies have been defeated!');
            state.currentEnemyIndex = 0;
            state.enemies.forEach(enemy => {
                enemy.health = enemy.damage === 6 ? 30 : 35;
            });
            initGame(state);
        }
    } else if (state.player.health <= 0) {
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
        initGame(state);
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
    document.getElementById('discard-btn').disabled = state.discardCount === 0 || state.selectedCards.size === 0;
    
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