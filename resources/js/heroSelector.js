/**
 * Hero Selector module for OW2 Counter Picker
 * Handles the hero selection UI
 */

const HeroSelector = {
    // Store the currently dragged hero info
    draggedHero: null,
    draggedRole: null,

    /**
     * Update the selector position based on mouse position
     * @param {Event} e - The mouse event
     */
    updateSelectorPosition: function(e) {
        const selector = document.querySelector('.hero-selector');
        const blueTeam = document.querySelector('.blue-team');
        const redTeam = document.querySelector('.red-team');
        const blueRect = blueTeam.getBoundingClientRect();
        const redRect = redTeam.getBoundingClientRect();

        requestAnimationFrame(() => {
            const selectorHeight = selector.getBoundingClientRect().height;
            const midPoint = (blueRect.bottom + redRect.top) / 2;
            const mouseY = e ? e.clientY : midPoint;  // Use midPoint if no mouse event

            if (mouseY < midPoint) {
                selector.style.top = `${blueRect.top}px`;
            } else {
                selector.style.top = `${redRect.bottom - selectorHeight}px`;
            }

            // Show selector after position is set
            selector.style.opacity = '1';
        });
    },

    /**
     * Populate the hero selector grid
     * @param {Object} heroData - The hero data object
     */
    populateHeroSelector: function(heroData) {
        // First populate the grid
        Object.entries(heroData).forEach(([hero, data]) => {
            const section = document.querySelector(`.role-section[data-role="${data.role}"] .hero-grid`);
            if (section) {
                const heroIcon = document.createElement('div');
                heroIcon.className = 'hero-icon-select';
                heroIcon.style.backgroundImage = `url('${getHeroIcon(hero)}')`;
                heroIcon.setAttribute('data-hero', hero);
                heroIcon.setAttribute('data-role', data.role);
                heroIcon.draggable = true;
                section.appendChild(heroIcon);
            }
        });

        // Set up drag and drop after populating
        this.setupDragAndDrop();
    },

    /**
     * Set up drag and drop functionality
     */
    setupDragAndDrop: function() {
        const selector = document.querySelector('.hero-selector');
        const self = this;

        // Use event delegation for drag events
        selector.addEventListener('dragstart', (e) => {
            if (e.target.matches('.hero-icon-select')) {
                e.target.classList.add('dragging');
                self.draggedHero = e.target.dataset.hero;
                self.draggedRole = e.target.dataset.role;
                e.dataTransfer.setData('text/plain', self.draggedHero);
                e.dataTransfer.setData('hero-role', self.draggedRole);
            }
        });

        selector.addEventListener('dragend', (e) => {
            if (e.target.matches('.hero-icon-select')) {
                e.target.classList.remove('dragging');
                self.draggedHero = null;
                self.draggedRole = null;
                // Clear any lingering highlights
                document.querySelectorAll('.player-row').forEach(row => {
                    row.classList.remove('drop-hover', 'invalid-drop');
                });
            }
        });

        // Set up drop targets
        document.querySelectorAll('.player-row').forEach(row => {
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const targetRole = row.querySelector('.hero-select').dataset.role;
                const targetTeam = row.querySelector('.hero-select').dataset.team;

                const isValidRole = self.draggedRole === targetRole;
                const isDuplicate = getSelectedHeroes(targetTeam).includes(self.draggedHero);

                // Use CSS classes instead of inline styles
                if (isValidRole && !isDuplicate) {
                    row.classList.add('drop-hover');
                    row.classList.remove('invalid-drop');
                } else {
                    row.classList.remove('drop-hover');
                    row.classList.add('invalid-drop');
                    e.dataTransfer.dropEffect = 'none';
                }
            });

            row.addEventListener('dragleave', (e) => {
                row.classList.remove('drop-hover', 'invalid-drop');
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drop-hover', 'invalid-drop');

                const hero = e.dataTransfer.getData('text/plain');
                const heroRole = e.dataTransfer.getData('hero-role');
                const select = row.querySelector('.hero-select');
                const team = select.dataset.team;

                // Only update if roles match and hero isn't already selected
                if (select &&
                    heroRole === select.dataset.role &&
                    !getSelectedHeroes(team).includes(hero)) {
                    select.value = hero;
                    select.dispatchEvent(new Event('change'));
                }
            });
        });
    },

    /**
     * Initialize the hero selector
     */
    init: function() {
        // Update mousemove handler
        document.addEventListener('mousemove', this.updateSelectorPosition);
    }
};