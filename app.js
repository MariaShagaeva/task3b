/* Константы API */
const API_URL = 'https://jsonplaceholder.typicode.com/users';
const USERS_URL = `${API_URL}/users`; 
const POSTS_URL = `${API_URL}/posts`;
const POSTS_LIMIT = 3;

/* Ссылки на DOM */
const loadBtn = document.getElementById('loadBtn');
const searchInput = document.getElementById('searchInput');
const usersList = document.getElementById('usersList');
const postsArea = document.getElementById('postsArea');
const emptyState = document.getElementById('emptyState');
const postsEmptyState = document.getElementById('postsEmptyState');
const statusMessage = document.getElementById('statusMessage');

/* Состояние */
let allUsers = [];

/* Расшифровки кодов HTTP — на случай, если statusText пустой (HTTP/2) */
const HTTP_STATUS_TEXT = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable'
};

/* Хелпер fetch: всегда бросает ошибку с НОМЕРОМ в начале. */
async function fetchJSON(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (networkError) {
    // Сетевой сбой: fetch не дошёл до сервера → нет response.status
    throw new Error(`[0] Сетевая ошибка (запрос не выполнен) — ${url}`);
  }

  if (!response.ok) {
    // HTTP-ошибка: 4xx или 5xx
    const reason = response.statusText || HTTP_STATUS_TEXT[response.status] || '';
    throw new Error(`[${response.status}] ${reason} — ${url}`);
  }

  return response.json();
}

/* Вспомогательные функции UI */
function showMessage(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = `status-message status-message--${type}`;
}

function clearMessage() {
  statusMessage.textContent = '';
  statusMessage.className = 'status-message';
}

function toggleLoading(isLoading, btn) {
  if (isLoading) {
    btn.disabled = true;
    btn.textContent = 'Загрузка...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.idleText || 'Загрузить пользователей';
  }
}

/* Отрисовка пользователей */
function renderUsers(users) {
  usersList.textContent = '';

  if (users.length === 0) {
    emptyState.textContent = searchInput.value.trim()
      ? 'Пользователи не найдены'
      : 'Пользователи не загружены. Нажмите «Загрузить пользователей».';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const fragment = document.createDocumentFragment();

  users.forEach(user => {
    const article = document.createElement('article');
    article.className = 'user-item';
    article.dataset.userId = user.id;

    const name = document.createElement('h3');
    name.className = 'user-item__name';
    name.textContent = user.name;

    const email = document.createElement('p');
    email.className = 'user-item__row';
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement('p');
    city.className = 'user-item__row';
    city.textContent = `Город: ${user.address.city}`;

    const postsBtn = document.createElement('button');
    postsBtn.type = 'button';
    postsBtn.className = 'btn btn--secondary';
    postsBtn.textContent = 'Показать публикации';
    postsBtn.dataset.idleText = 'Показать публикации';
    postsBtn.addEventListener('click', () => showPosts(user, postsBtn));

    article.append(name, email, city, postsBtn);
    fragment.appendChild(article);
  });

  usersList.appendChild(fragment);
}

/* Отрисовка публикаций */
function renderPosts(user, posts) {
  postsArea.textContent = '';
  postsEmptyState.classList.add('hidden');

  const heading = document.createElement('h3');
  heading.className = 'posts-heading';
  heading.textContent = `Публикации пользователя: ${user.name}`;
  postsArea.appendChild(heading);

  const firstPosts = posts.slice(0, POSTS_LIMIT);

  if (firstPosts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'У этого пользователя нет публикаций.';
    postsArea.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  firstPosts.forEach((post, index) => {
    const article = document.createElement('article');
    article.className = 'post-item';

    const title = document.createElement('h4');
    title.className = 'post-item__title';
    title.textContent = `${index + 1}. ${post.title}`;

    const body = document.createElement('p');
    body.className = 'post-item__body';
    body.textContent = post.body;

    article.append(title, body);
    fragment.appendChild(article);
  });

  postsArea.appendChild(fragment);
}

/* Подсветка активной карточки */
function highlightActiveUser(userId) {
  usersList.querySelectorAll('.user-item').forEach(item => {
    item.classList.toggle('user-item--active', item.dataset.userId === String(userId));
  });
}

/* 1. Загрузка пользователей — GET */
async function loadUsers() {
  clearMessage();
  showMessage('Загрузка пользователей...', 'loading');
  toggleLoading(true, loadBtn);

  try {
    // Вся проверка response.ok и разбор ошибки — внутри fetchJSON
    const data = await fetchJSON(USERS_URL);
    allUsers = data;
    applyFilter();
    showMessage(`Пользователи успешно загружены! Всего: ${data.length}`, 'success');
  } catch (error) {
    allUsers = [];
    usersList.textContent = '';
    emptyState.textContent = 'Не удалось загрузить пользователей. Попробуйте ещё раз.';
    emptyState.classList.remove('hidden');
    showMessage(`Не удалось загрузить пользователей: ${error.message}`, 'error');
    console.error(error);
  } finally {
    toggleLoading(false, loadBtn);
  }
}

/* 2. Поиск без нового запроса */
function applyFilter() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query === ''
    ? allUsers
    : allUsers.filter(user => user.name.toLowerCase().includes(query));
  renderUsers(filtered);
}

/* 3. Публикации пользователя — GET */
async function showPosts(user, btn) {
  clearMessage();
  showMessage(`Загрузка публикаций пользователя ${user.name}...`, 'loading');
  toggleLoading(true, btn);
  highlightActiveUser(user.id);

  const url = `${POSTS_URL}?userId=${user.id}`;

  try {
    const data = await fetchJSON(url);
    renderPosts(user, data);
    showMessage('Публикации успешно загружены!', 'success');
  } catch (error) {
    postsArea.textContent = '';
    postsEmptyState.textContent = 'Не удалось загрузить публикации. Попробуйте ещё раз.';
    postsEmptyState.classList.remove('hidden');
    showMessage(`Не удалось загрузить публикации: ${error.message}`, 'error');
    console.error(error);
  } finally {
    toggleLoading(false, btn);
  }
}

/* Инициализация */
loadBtn.addEventListener('click', loadUsers);
searchInput.addEventListener('input', applyFilter);