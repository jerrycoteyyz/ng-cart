-- Replace placehold.co text blocks with real Unsplash stock photos.
-- If any image appears broken after deploying, update that row with a new URL
-- and create V005 to apply it going forward.

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Wireless Noise-Cancelling Headphones';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Mechanical Keyboard';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1625480860249-be231806ef24?w=400&h=400&fit=crop&auto=format'
WHERE name = 'USB-C Hub (7-in-1)';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Classic Crewneck Sweatshirt';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Slim-Fit Chino Trousers';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1544966503-7f2b40f4c0ab?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Waterproof Trail Jacket';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1532012788600-a0347d4c0dde?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Clean Code';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=400&fit=crop&auto=format'
WHERE name = 'Designing Data-Intensive Applications';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1526243741027-444d633d7365?w=400&h=400&fit=crop&auto=format'
WHERE name = 'The Pragmatic Programmer';
