const faqItems = document.querySelectorAll('.faq-item');
if (faqItems) {
    faqItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            if (item.open) return;

            faqItems.forEach((otherItem) => {
                if (otherItem !== item) {
                    otherItem.removeAttribute('open');
                }
            });
        });
    });
}