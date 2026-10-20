# Остановка rollan.tech — задание для 3D-модели

## Зафиксированное направление

Реалистичная обжитая постсоветская остановка. Бетон, бумага, тёплый вечер.
Посетитель находится внутри, на уровне глаз. Сайт воспринимается как место,
а не макет, вращающийся перед камерой. Не использовать отклонённый CSS-прототип.

## Промпт для Tripo

```text
A realistic life-size Soviet-era bus stop shelter from a small city in Kazakhstan.
Walk-in architectural environment, fully modeled and textured on both the interior
and exterior. Open front entrance, three solid walls: one broad rear wall and two
shorter side walls. Straight flat vertical walls with large unobstructed areas
for attaching editable posters later. Weathered warm gray concrete, faded muted
sage-green steel frame, aged flat metal canopy, a simple worn wooden bench placed
low against the rear wall. Subtle remnants of torn paper and old glue, believable
wear, restrained patina, cared-for but lived-in, atmospheric and inviting.
Approximately 5 meters wide, 2.5 meters deep, 3 meters tall. Human-scale accessible
interior with enough standing room between the bench and the entrance. Physically
based materials suitable for close-up first-person viewing. Neutral lighting in
the textures; sunset lighting will be added in the scene. Single isolated bus
shelter asset. No people, no bus, no text, no logos, no readable posters, no sky,
no surrounding buildings, no terrain, no cutaway, no miniature diorama base.
```

Пожелания к генерации, а не гарантии результата: три ровные стены, открытый вход,
объёмное пространство внутри. Если модель выглядит хорошо только снаружи,
она не подходит для этого сайта. Сначала посмотреть внутренние поверхности
и зазоры между стенами, крышей и скамейкой.

## Передача модели

- Предпочтительно один `.glb` со встроенными текстурами.
- Материалы PBR, если есть такая опция. Без анимации и рига.
- Для первой проверки достаточно текстур 2K; более тяжёлый исходник сохранить отдельно.
- Практический ориентир для веба: 30–80 тысяч треугольников, до 10–15 МБ.
  Это бюджет для подготовки, а не причина выбрасывать удачную более тяжёлую модель.
- Масштаб, положение и оптимизацию проверить после импорта.
- Дополнительно полезен скриншот изнутри: вид на заднюю стену и одну боковую.

## Окружение — отдельный слой

Небо, мягкий вечерний свет, двор и силуэты домов, тротуар и дорога добавляются
в веб-сцену отдельно. Не просить Tripo генерировать всё одним объектом:
это мешает качеству ближнего плана и настройке сцены.

## Следующий этап

1. Проверить GLB: внутренние поверхности, размер, материалы, геометрия стен.
2. Собрать один убедительный статичный вид от первого лица с окружением и светом.
3. После визуального согласования добавить осмотр и переходы между стенами.
4. Затем разместить редактируемые объявления и сделать редактор.
5. Проверить телефон и ПК, получить Vercel Preview, затем публиковать на домене.

Источники формата и материалов:
- https://docs.tripo3d.ai/export/conversion.html
- https://developers.tripo3d.ai/en/docs/models-texture
