document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /**
   * Category Filter
   */
  const filterButtons = document.querySelectorAll('.buttons .filter-button');
  const articleCards = document.querySelectorAll('.card');

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const selectedCategory = button.getAttribute('data-category');

      articleCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');

selectedCategory === 'filter-all' || selectedCategory === cardCategory ? card.style.display = 'block' : card.style.display = 'none'

      });
    });
  });
});