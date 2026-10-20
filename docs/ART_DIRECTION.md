# Окружение и материалы

Направление: обжитая постсоветская остановка, тёплый вечер. Выцветшая бумага,
бетон, дерево, янтарный свет. Листки принадлежат самой стене.

## Панорама

- Генератор: встроенный `image_gen.imagegen`, новая генерация из текста.
- Дата: 2026-10-20 (местное время).
- Исходник: 2172 × 724 PNG.
- Файл сайта: `assets/environment/pavlodar-evening-v2.webp`, WebP quality 92, 582 КБ.
- Художественная интерпретация Павлодара, не документальная съёмка места.
- Исходная панорама сохранена как источник. В текущей сцене используется прозрачный силуэт города на плоских панелях с исходной пропорцией 3:1; небо отдельное.
- Подготовка: только преобразование PNG → WebP через sharp.

### Точный промпт

Use case: illustration-story. Asset type: panoramic environment matte painting for a first-person web scene, 3:1 wide panoramic landscape. Primary request: Hand-painted believable quiet residential street in Pavlodar Kazakhstan on a warm late summer evening, viewed at human standing eye height from a sidewalk near an old Soviet bus shelter, but do NOT draw the bus shelter itself. Across a narrow asphalt street: a varied continuous row of five-story Soviet apartment blocks, worn warm beige plaster, small enclosed balconies, a few amber glowing windows, poplar and birch trees with natural varied crowns, modest courtyards, a small corner shop with no readable sign, long soft late afternoon shadows and a softly luminous peach blue sky. Painterly environmental concept art, fine gouache and oil brushwork, subtle ink edges, cinematic but understated, cozy and lived-in, realistic architectural proportions with an editorial illustration softness. Composition: extremely wide 3:1 panorama with horizon at 48 percent of the image height, sky in upper 40 percent, houses between 40 and 65 percent, narrow road across the lower 25 percent, no giant foreground objects; left and right edges similar sky and foliage tones for wrapping around a distant cylindrical backdrop. Colors: muted sage, dusty warm stone, honey sunlight, smoky blue sky. No people, cats, cars in foreground, bus shelter, posters, text, letters, logos, watermark, no 3D low-poly aesthetic, no miniature or isometric view. This is an illustration that will sit behind real 3D concrete and wood: retain tactile surface detail, avoid cartoon outlines.

## Отделение города от неба

Повторное редактирование встроенным `image_gen.imagegen`, прозрачный фон.
Источник — исходная панорама выше. Результат 2172 × 724 RGBA PNG;
файл сайта `assets/environment/pavlodar-city-cutout.webp`, quality 95 / alphaQuality 100.
Силуэт домов и деревьев не содержит неба; исходный рисунок больше не оборачивается
на 360 градусов и не продолжается за вертикальные границы UV. Небо — окружение Three.js.

### Промпт редактирования

Edit this exact panoramic illustration into a transparent-background city skyline cutout for a 3D environment. Keep the entire original extremely wide 3:1 composition, all apartment buildings, poplar trees, birches, bushes, their original positions, proportions, detailed architecture and warm evening lighting. Remove ALL sky completely to full transparency, including all sky visible between branches, leaves and buildings. Remove the foreground street/asphalt and sidewalk below the row of buildings and bushes, leaving only a narrow continuous natural ground base under the distant vegetation. Keep the full width of the original panorama; do not zoom, crop the sides, rearrange buildings or redesign the town. This should be a realistic matte-painted row of Soviet apartment buildings and leafy trees with a precise natural irregular silhouette against transparency above. No sky colors, clouds, backdrop, border, shadow background, text, checkerboard baked in, watermark. Deliver a very wide 3:1 transparent PNG asset with original canvas proportions.
