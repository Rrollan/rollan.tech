      export const SECTIONS = {
        about: {
          dark: false,
          html:
            '<div class="kicker">Досье объекта · дело № 001</div>' +
            '<h3 id="sheetTitle">Роллан Рогожин, <span class="red">разработчик</span></h3>' +
            '<p>Привет. Я Роллан, мне 18, живу в Павлодаре и учусь в ПВКУ. Днём — студент, всё остальное время — разработчик: делаю фронтенд и web3-проекты, от лендингов до игр на Solana.</p>' +
            '<p>Мой флагман — <b>IMPERIVM</b>, карточная PvP-игра на Solana: собрана, работает мультиплеер один на один, проект подан на международный хакатон Crypto World\u2019s Fair (трек Superteam Kazakhstan). Параллельно строю собственного ИИ-ассистента — простого, для людей, которые не хотят разбираться в технологиях.</p>' +
            '<p class="hand">Вайб-кодинг — не мем, а мой рабочий процесс: я проектирую и ставлю задачи, ИИ-агенты помогают писать код быстрее, чем автобус № 5 приходит на эту остановку.</p>' +
            '<div class="kicker" style="margin-top:10px">Особые приметы</div>' +
            '<ul>' +
            '<li>стек: TypeScript, React / Next.js, Solana</li>' +
            '<li>любит имперский мрамор, золото и библейские отсылки в дизайне</li>' +
            '<li>проверяет каждую сборку на ПК и телефоне, сырое не сдаёт</li>' +
            '<li>на связи быстрее, чем приезжает маршрутка</li>' +
            '</ul>'
        },
        services: {
          dark: false,
          html:
            '<div class="kicker">Услуги · прейскурант на обороте</div>' +
            '<h3 id="sheetTitle">Что я <span class="red">делаю</span></h3>' +
            '<p><b>Сайты и веб-приложения.</b> Лендинги, визитки (даже такие, как эта доска), интерфейсы для сервисов. Быстро, адаптивно, с характером — а не «как у всех».</p>' +
            '<p><b>Web3.</b> dApps на Solana, NFT-коллекции и минты, игровые механики на блокчейне: мемпул, стейкинг, внутриигровая валюта.</p>' +
            '<p><b>Боты и автоматизация.</b> Telegram-боты, ИИ-агенты, пайплайны контента — то, что снимает рутину и работает, пока ты спишь.</p>' +
            '<div class="kicker" style="margin-top:8px">Инструменты</div>' +
            '<div class="chips">' +
            '<span class="chip">TypeScript</span><span class="chip">React</span><span class="chip">Next.js</span>' +
            '<span class="chip">Node.js</span><span class="chip">Python · FastAPI</span><span class="chip">Solana · web3.js</span>' +
            '<span class="chip">Metaplex</span><span class="chip">Tauri</span><span class="chip">ИИ-агенты</span>' +
            '</div>' +
            '<p class="hand">Надо что-то собрать? Корешки с контактами — на жёлтом объявлении справа.</p>'
        },
        game: {
          dark: true,
          html:
            '<div class="kicker">Главный проект · Solana devnet</div>' +
            '<h3 id="sheetTitle">IMPERIVM</h3>' +
            '<p class="hand" style="margin-top:-6px">Veni. Vidi. Rugi.</p>' +
            '<p>Карточный PvP-батлер в духе Hearthstone, где крипта — не обёртка, а механика: мемпул и фронтраннинг решают исход хода, блок-часы тикают вместо таймера, а казначейства — вместо очков здоровья.</p>' +
            '<ul>' +
            '<li>онлайн 1×1: комнаты по кодам, таймер хода, реконнект</li>' +
            '<li>40 NFT-карт коллекции IMPERIVM Genesis (Metaplex, devnet)</li>' +
            '<li>паки за внутриигровой $RUG, герои-кошельки: Кит, Билдер, Деген, Валидатор</li>' +
            '<li>стиль — имперский мрамор: мраморный стол, газ кристаллами, конфетти победы</li>' +
            '</ul>' +
            '<div class="big-links">' +
            '<a href="https://imperivm.onrender.com" target="_blank" rel="noopener"><span class="bl-name">Играть в IMPERIVM</span><span class="bl-val">imperivm.onrender.com</span></a>' +
            '<a href="https://github.com/Rrollan/imperivm" target="_blank" rel="noopener"><span class="bl-name">Код на GitHub</span><span class="bl-val">Rrollan/imperivm</span></a>' +
            '</div>' +
            '<p style="font-size:14px; opacity:.75">Нюанс: хостинг бесплатный и иногда спит — первый заход может будиться до минуты. Как автобус, только честно предупреждает.</p>'
        },
        contacts: {
          dark: false,
          html:
            '<div class="kicker">Связь · все каналы</div>' +
            '<h3 id="sheetTitle">Как меня <span class="red">найти</span></h3>' +
            '<p>Быстрее всего — Telegram: читаю сам, отвечаю сам, без менеджеров и «мы вам перезвоним».</p>' +
            '<div class="big-links">' +
            '<a href="https://t.me/oderefyu" target="_blank" rel="noopener"><span class="bl-name">Telegram</span><span class="bl-val">@oderefyu</span></a>' +
            '<a href="https://github.com/Rrollan" target="_blank" rel="noopener"><span class="bl-name">GitHub</span><span class="bl-val">Rrollan</span></a>' +
            '<a href="https://www.instagram.com/rogozhinrollan" target="_blank" rel="noopener"><span class="bl-name">Instagram</span><span class="bl-val">rogozhinrollan</span></a>' +
            '<a href="https://rollan.tech" target="_blank" rel="noopener"><span class="bl-name">Сайт</span><span class="bl-val">rollan.tech</span></a>' +
            '</div>' +
            '<p class="hand">Павлодар, Казахстан · работаю удалённо по всему миру, где есть интернет и розетки.</p>'
        },
        bus: {
          dark: false,
          html:
            '<div class="kicker">Официальное уведомление</div>' +
            '<h3 id="sheetTitle">Автобуса <span class="red">не будет</span></h3>' +
            '<p>Водитель ушёл в отпуск, диспетчер — в себя, а расписание на этой доске последний раз обновляли при другом курсе тенге.</p>' +
            '<p>Но есть и хорошие новости: разработчик с соседнего объявления — на месте, на связи и приезжает точно по расписанию. Оно называется «дедлайн».</p>' +
            '<p class="hand">Не жди автобус — напиши Роллану. Корешки с Telegram висят на жёлтом листке.</p>'
        },
        note: {
          dark: false,
          html:
            '<div class="kicker">Маркер и стикер — в комплекте</div>' +
            '<h3 id="sheetTitle">Записка <span class="red">на доску</span></h3>' +
            '<form class="note-form" id="noteForm">' +
            '<label for="noteText">Что написать</label>' +
            '<textarea id="noteText" rows="2" maxlength="90" placeholder="например: «Роллан, сделай мне сайт»" required></textarea>' +
            '<label for="noteName">Подпись (необязательно)</label>' +
            '<input id="noteName" type="text" maxlength="24" placeholder="прохожий" />' +
            '<button class="pin-btn" type="submit">Приколоть на доску</button>' +
            '</form>' +
            '<p style="margin-top:14px; font-size:14px; color:var(--ink-soft)">Записку, как и все записки на остановках, сорвёт первый же ветер — или обновление страницы.</p>'
        }
      };

