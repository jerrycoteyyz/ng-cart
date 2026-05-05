-- Fix three broken product images and replace placehold.co book images
-- with real covers from Open Library (verified working).

UPDATE products SET image_url = 'https://images.unsplash.com/photo-UXwnyQ7m-Mo?w=400&h=400&fit=crop&auto=format'
WHERE name = 'USB-C Hub (7-in-1)';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-F1F2i4dh8jI?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Classic Crewneck Sweatshirt';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-rEdhX5d1Hv0?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Waterproof Trail Jacket';

UPDATE products SET image_url = 'https://covers.openlibrary.org/b/isbn/0132350882-L.jpg'
WHERE name = 'Clean Code';

UPDATE products SET image_url = 'https://covers.openlibrary.org/b/isbn/1449373321-L.jpg'
WHERE name = 'Designing Data-Intensive Applications';

UPDATE products SET image_url = 'https://covers.openlibrary.org/b/isbn/0135957052-L.jpg'
WHERE name = 'The Pragmatic Programmer';
