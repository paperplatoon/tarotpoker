// Game state
let deck = [];
let hand = [];
let selectedCards = new Set();
let discardCount = 2;
let player = {
    health: 50,
    shield: 0,
    pentacles: 0
};

let enemies = [
    { health: 30, damage: 6 },
    { health: 35, damage: 8 }
];
let currentEnemyIndex = 0;
let enemy = enemies[currentEnemyIndex];

let selectingFinalHand = false;

// Card suits and values
const suits = ['Swords', 'Cups', 'Pentacles', 'Wands'];
const values = [1, 2, 3, 4, 5];

function initGame() {
    // Create deck
    deck = [];
    suits.forEach(suit => {
        values.forEach(value => {
            deck.push({ suit, value });
        });
    });
    
    shuffleDeck();
    hand = [];
    selectedCards.clear();
    discardCount = 2;
    drawCards(5);
    updateUI();
}

// Shuffle the deck
function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Draw cards from deck
function drawCards(count) {
    for (let i = 0; i < count; i++) {
        if (deck.length > 0) {
            hand.push(deck.pop());
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
    
    div.addEventListener('click', () => toggleCardSelection(index));
    
    return div;
}

// Toggle card selection
function toggleCardSelection(index) {
    if (selectingFinalHand && selectedCards.size >= 5 && !selectedCards.has(index)) {
        return; // Don't allow selecting more than 5 cards for final hand
    }
    
    if (selectedCards.has(index)) {
        selectedCards.delete(index);
    } else {
        selectedCards.add(index);
    }
    
    updateUI();
}

// Discard selected cards
function discardSelected() {
    if (discardCount <= 0 || selectedCards.size === 0) return;
    
    // Remove selected cards from hand
    const newHand = hand.filter((_, index) => !selectedCards.has(index));
    const discardedCount = selectedCards.size;
    
    // Draw new cards
    hand = newHand;
    drawCards(discardedCount);
    
    // Clear selected cards and update discard count
    selectedCards.clear();
    discardCount--;
    
    updateUI();
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
function updateHandCalculator() {
    if (hand.length >= 5) {
        const previewHand = hand.slice(0, 5);
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
function endTurn() {
    if (hand.length > 5) {
        // Need to select 5 cards
        selectingFinalHand = true;
        document.getElementById('select-hand-modal').style.display = 'flex';
        updateUI();
        return;
    }
    
    const selectedHand = hand.filter((_, index) => 
        hand.length === 5 || selectedCards.has(index)
    );
    
    if (selectedHand.length !== 5) {
        alert('Please select exactly 5 cards to end your turn.');
        return;
    }
    
    // Evaluate hand and calculate effects
    const { handType, scoringCards } = evaluateHand(selectedHand);
    const effects = calculateCombatEffects(selectedHand, scoringCards);
    
    // Apply effects
    enemy.health -= effects.damage;
    player.shield = effects.shield;
    player.health = Math.min(player.health + effects.healing, 50);
    player.pentacles += effects.pentacles;
    
    // Enemy turn
    const actualDamage = Math.max(0, enemy.damage - player.shield);
    player.health -= actualDamage;
    player.shield = 0;
    
    // Check win/lose conditions
    if (enemy.health <= 0) {
        currentEnemyIndex++;
        if (currentEnemyIndex < enemies.length) {
            alert('You defeated the enemy! Next battle!');
            enemy = enemies[currentEnemyIndex];
            // Reset for next battle
            initGame();
        } else {
            alert('You won! All enemies have been defeated!');
            currentEnemyIndex = 0;
            enemy = enemies[currentEnemyIndex];
            initGame();
        }
    } else if (player.health <= 0) {
        alert('You lost! Try again.');
        initGame();
    } else {
        initGame()
    }
}

// Update UI
function updateUI() {
    // Update enemy stats
    document.getElementById('enemy-health').textContent = enemy.health;
    document.getElementById('enemy-damage').textContent = enemy.damage;
    
    // Update player stats
    document.getElementById('player-health').textContent = player.health;
    document.getElementById('player-shield').textContent = player.shield;
    document.getElementById('player-pentacles').textContent = player.pentacles;

    document.getElementById('deck-count').textContent = deck.length;
    
    // Update cards container
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    hand.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        if (selectedCards.has(index)) {
            cardElement.classList.add('selected');
        }
        container.appendChild(cardElement);
    });
    
    // Update hand value if there are selected cards
    const handValueElement = document.getElementById('hand-value');
    if (selectedCards.size > 0) {
        const selectedHand = hand.filter((_, index) => selectedCards.has(index));
        if (selectedHand.length === 5) {
            const { handType } = evaluateHand(selectedHand);
            handValueElement.textContent = `Hand: ${handType}`;
        } else {
            handValueElement.textContent = `Select 5 cards for a hand`;
        }
    } else if (hand.length === 5) {
        const { handType } = evaluateHand(hand);
        handValueElement.textContent = `Hand: ${handType}`;
    } else {
        handValueElement.textContent = '';
    }
    
    // Update buttons
    document.getElementById('discard-count').textContent = discardCount;
    document.getElementById('discard-btn').disabled = discardCount === 0 || selectedCards.size === 0;
    
    // Update confirm button in modal
    if (selectingFinalHand) {
        document.getElementById('confirm-hand-btn').disabled = selectedCards.size !== 5;
    }
    
    // Update hand calculator
    updateHandCalculator();
}

// Confirm final hand selection
function confirmHandSelection() {
    if (selectedCards.size !== 5) return;
    
    // Close modal
    document.getElementById('select-hand-modal').style.display = 'none';
    selectingFinalHand = false;
    
    // Process end turn with selected cards
    endTurn();
}

// Event listeners
document.getElementById('discard-btn').addEventListener('click', discardSelected);
document.getElementById('end-turn-btn').addEventListener('click', endTurn);
document.getElementById('confirm-hand-btn').addEventListener('click', confirmHandSelection);

// Start the game
initGame();