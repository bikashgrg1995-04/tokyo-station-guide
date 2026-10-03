INSERT INTO operators (name, slug, description)
VALUES
    (
        'JR East',
        'jr-east',
        'East Japan Railway Company services in the Tokyo area.'
    ),
    (
        'Tokyo Metro',
        'tokyo-metro',
        'Tokyo Metro subway network.'
    );

INSERT INTO lines (
    operator_id,
    name,
    slug,
    code,
    description,
    color
)
VALUES
    (
        (SELECT id FROM operators WHERE slug = 'jr-east'),
        'Yamanote Line',
        'yamanote-line',
        'JY',
        'JR East loop line serving major Tokyo districts.',
        '#9ACD32'
    ),
    (
        (SELECT id FROM operators WHERE slug = 'tokyo-metro'),
        'Ginza Line',
        'ginza-line',
        'G',
        'Tokyo Metro Ginza Line.',
        '#FF9500'
    ),
    (
        (SELECT id FROM operators WHERE slug = 'tokyo-metro'),
        'Marunouchi Line',
        'marunouchi-line',
        'M',
        'Tokyo Metro Marunouchi Line.',
        '#E60012'
    );