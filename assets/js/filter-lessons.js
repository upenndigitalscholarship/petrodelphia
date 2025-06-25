document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /**
   * Category Filter
   */
  const filterButtons = document.querySelectorAll('.buttons .filter-button');
  const articleCards = document.querySelectorAll('.row .col');

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const selectedCategory = button.getAttribute('data-category');

      articleCards.forEach(col => {
        const cardCategory = col.getAttribute('data-category');

selectedCategory === 'filter-all' || selectedCategory === cardCategory ? col.style.display = 'block' : col.style.display = 'none'

      });
    });
  });
});