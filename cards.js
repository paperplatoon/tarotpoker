// Add to the beginning of game.js file, after the constants section
const specialCards = [
  { 
    name: "Death", 
    type: "special",
    description: "If you have at least 10 pentacles, deals 25 damage to the enemy. Otherwise, gives you 3 pentacles.",
    async effect(state, index) {
      const cardElement = document.querySelectorAll('.card')[index];
      const hasSufficientPentacles = state.player.pentacles >= 10;
      
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
          state.player.pentacles -= 10;
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
  }
];