# THE ZOMBIE APOCALYPSE — Survival Archive

Статический сайт на **GitHub Pages + Firebase**. Никакого React, Vite, Node.js или отдельного сервера не требуется.

## Что уже реализовано
- Главная страница в тёмном постапокалиптическом стиле.
- Разделы: статьи, бестиарий, персонажи, локации, аномалии, предметы, фракции, правила, новости и обновления.
- Загрузка опубликованных материалов из Cloud Firestore.
- Вход через Firebase Authentication (Email/Password).
- Проверка прав администратора по документу `admins/{uid}`.
- Создание материалов, публикация/черновик, загрузка обложек в Firebase Storage.
- Удаление материалов администратором.
- Правила Firestore и Storage.

## 1. Загрузить файлы в GitHub
1. Создай репозиторий GitHub, например `the-zombie-apocalypse`.
2. Загрузи в корень репозитория все файлы из этого архива, сохранив структуру.
3. Открой **Settings → Pages**.
4. В разделе Build and deployment выбери **GitHub Actions** как Source.
5. Убедись, что папка `.github/workflows` вместе с файлом `pages.yml` загружена в репозиторий.
6. Открой вкладку **Actions** и дождись успешного запуска workflow **Deploy static site to GitHub Pages**.
7. GitHub Pages выдаст адрес сайта. После каждого push в ветку `main` сайт будет обновляться автоматически.

> В Firebase Authentication → Settings → Authorized domains добавь домен GitHub Pages, например `USERNAME.github.io` (без `https://` и пути репозитория).

## 2. Firebase Authentication
1. Firebase Console → Authentication → Sign-in method.
2. Включи **Email/Password**.
3. Authentication → Users → Add user.
4. Создай свой административный email и пароль. Не передавай пароль никому.

## 3. Опубликовать правила безопасности
В Firebase Console:
- Firestore Database → Rules: замени правила содержимым `firestore.rules` и нажми Publish.
- Storage → Rules: замени правила содержимым `storage.rules` и нажми Publish.

Убедись, что Cloud Firestore database и Storage bucket созданы и активны.

## 4. Выдать себе права администратора
1. Authentication → Users → найди созданного пользователя.
2. Скопируй его **User UID**.
3. Firestore Database → Data → Start collection.
4. Collection ID: `admins`.
5. Document ID: вставь UID пользователя (важно: документ должен называться ровно UID).
6. Добавь поле:
   - Field: `enabled`
   - Type: `boolean`
   - Value: `true`
7. Сохрани.

Права администратора выдаются только вручную владельцем проекта из Firebase Console. Посетитель не может назначить себя администратором через сайт.

## 5. Проверка
1. Открой опубликованный сайт.
2. Нажми «Вход администрации».
3. Войди email и паролем из Authentication.
4. Если UID добавлен в `admins` с `enabled: true`, появится форма создания материала.
5. Создай тестовую статью и проверь, что она отображается в архиве.

## Важно про Firebase config
`firebase-config.js` содержит Web App config. `apiKey` в клиентском Firebase-приложении не является паролем администратора. Реальную защиту обеспечивают Authentication и Security Rules. Не публикуй Service Account JSON или приватные ключи.

## Изменения
После изменения файлов на GitHub Pages сайт обновится автоматически. Для локального тестирования открой проект через локальный статический сервер (например, расширение Live Server в VS Code), потому что ES modules не работают корректно при открытии `index.html` как `file://`.
