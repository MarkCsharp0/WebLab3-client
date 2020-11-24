let favoriteCities;
const defaultCity = 498817;

const apiKey = 'fa80dfd43dd64fe4ef5aaa1ab1bce741';
const apiLink = 'https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&';

const dirRange = 22.5;
const fullCircle = 360;
const directions = [
    "северный", "северо-северо-восточный", "северо-восточный", "восточно-северо-восточный",
    "восточный", "восточно-юго-восточный", "юго-восточный", "юго-юго-восточный",
    "южный", "юго-юго-западный", "юго-западный", "западно-юго-западный",
    "западный", "западно-северо-западный", "северо-западный", "северо-северо-западный"];

window.onload = function() {
    loadHere();
    loadFavorites();
    let addCityForm = document.forms.add_city;
    addCityForm.addEventListener('submit', addCity);
    document.querySelector('div.weather-header input.btn_update_desktop').addEventListener('click', loadHere);
    document.querySelector('div.weather-header input.btn_update_mobile').addEventListener('click', loadHere);
};

async function addCity(event) {
    event.preventDefault();
    let input = event.target.input;
    let cityName = input.value;
    if (cityName === ''){
        return;
    }

    input.value = '';
    let loader = getFavoriteLoader();
    document.querySelector('ul.favorite').append(loader);

    let weather;
    try {
        weather = await getWeatherByName(cityName);
    } catch (err) {
        removeFavoriteLoader('Не удалось получить информацию');
        return;
    }
    if (weather.cod >= 300) {
        removeFavoriteLoader('Не удалось получить информацию');
        return;
    }
    else if (favoriteCities.includes(weather.id)) {
        removeFavoriteLoader(`Город ${cityName} уже есть в списке Избранное`);
        return;
    }

    favoriteCities.push(weather.id);
    localStorage.setItem('favoriteList', JSON.stringify(favoriteCities));
    document.querySelector('ul.favorite').replaceChild(createCityCardFavorite(weather), document.querySelector('ul.favorite li.loader'));
}

async function getWeather(url) {
    const response = await fetch(url);
    return await response.json();
}

function degreesToDirection(degrees) {
    if(degrees < 0 || degrees > fullCircle) {
        return null;
    }
    for (let dir = 0, i = 0; dir < fullCircle; dir += dirRange, i++) {
        diff = degrees - dir;
        if ((diff >= -0.5 * dirRange && diff < 0.5 * dirRange) ||
            (diff - fullCircle >= -0.5 * dirRange && diff - fullCircle < 0.5 * dirRange)) {
            return directions[i];
        }
    }
}

async function loadHere() {
    let loader = getHereLoader();
    document.querySelector('.here').innerHTML = "";
    document.querySelector('.here').append(loader);
    if (!navigator.geolocation) {
        await loadHereDefault();
    }
    else {
        navigator.geolocation.getCurrentPosition(loadHereByCoords, loadHereDefault);
    }
}

function getError() {
    return document.getElementById('error_here').content.cloneNode(true);
}

async function loadHereByCoords(position) {
    let error = getError();
    let weather;
    try {
        weather = await getWeatherByCoords(position.coords.latitude, position.coords.longitude);
    } catch (err) {
        insertHereError(error);
    }
    if(weather.cod >= 300) {
        insertHereError(error);
    }
    else {
        document.querySelector('.here').replaceChild(createCityCardHere(weather), document.querySelector('.here .loader'));
    }
}

function getFavoriteLoader() {
    return document.getElementById('loader_favorite').content.cloneNode(true);
}

function getHereLoader() {
    return document.getElementById('loader_here').content.cloneNode(true);
}

function insertHereError(error) {
    document.querySelector('.here').replaceChild(error, document.querySelector('.here .loader'));
    alert('Не удалось загрузить информацию');
}

function removeFavoriteLoader(message) {
    document.querySelector('ul.favorite').removeChild(document.querySelector('ul.favorite li.loader'));
    alert(message);
}

async function loadHereDefault() {
    let error = getError();
    let weather;
    try {
        weather = await getWeatherByID(defaultCity);
    } catch (err) {
        insertHereError(error);
    }
    if(weather.cod >= 300) {
        insertHereError(error);
    }
    else {
        let cityCard = createCityCardHere(weather);
        document.querySelector('.here').replaceChild(cityCard, document.querySelector('.here .loader'));
    }
}

function createCityCardHere(weather) {
    let card = document.getElementById('here').content.cloneNode(true);
    let icon = weatherIdToIcon(weather.weather[0].id);
    card.querySelector('div.city-header h2').innerHTML = weather.name;
    card.querySelector('div.city-header div.icon-weather').classList.add(`weather_${icon}`);
    card.querySelector('div.city-header div.temperature').insertAdjacentHTML('afterbegin', weather.main.temp);
    let item;
    for (item of cityInfoItems(weather)) {
        card.querySelector('ul.weather-info').append(item);
    }

    return card;
}

function weatherIdToIcon(weatherID) {
    if(weatherID === 800)
        return 'sunny';
    if(weatherID === 801)
        return 'light_clouds';
    if(weatherID === 802)
        return 'clouds';
    if(weatherID === 803 || weatherID === 804)
        return 'heavy_clouds';
    if((weatherID >= 300 && weatherID <= 399) || (weatherID >= 520 && weatherID <= 531))
        return 'light_rain';
    if(weatherID >= 500 && weatherID <= 504)
        return 'rain';
    if(weatherID >= 200 && weatherID <= 299)
        return 'thunder';
    if((weatherID >= 600 && weatherID <= 699) || weatherID === 511)
        return 'snow';
    if(weatherID >= 700 && weatherID <= 799)
        return 'mist';
    return 'unknown';
}

function cityInfoItems(weather) {
    let items = [];
    let direction = degreesToDirection(weather.wind.deg);
    let params = [
        {name: 'Ветер', value: `${weather.wind.speed} м/с, ${direction}`},
        {name: 'Облачность', value: `${weather.clouds.all} %`},
        {name: 'Давление', value: `${weather.main.pressure} гПа`},
        {name: 'Влажность', value: `${weather.main.humidity} %`},
        {name: 'Координаты', value: `[${weather.coord.lon}, ${weather.coord.lat}]`}];

    for (const param of params) {
        let infoItem = document.getElementById('weather-info').content.cloneNode(true);
        infoItem.querySelector('span.weather-info__string-name').innerHTML = param.name;
        infoItem.querySelector('span.weather-info__string-value').innerHTML = param.value;
        items.push(infoItem);
    }

    return items;
}

function getWeatherByID(cityID) {
    let requestURL = `${apiLink}id=${encodeURI(cityID)}&appid=${apiKey}`;
    return getWeather(requestURL);
}

function getWeatherByName(cityName) {
    let requestURL = `${apiLink}q=${encodeURI(cityName)}&appid=${apiKey}`;
    return getWeather(requestURL);
}

function getWeatherByCoords(latitude, longitude) {
    let requestURL = `${apiLink}lat=${encodeURI(latitude)}&lon=${encodeURI(longitude)}&appid=${apiKey}`;
    return getWeather(requestURL);
}

async function loadFavorites() {
    if (localStorage.getItem('favoriteList') == null) {
        favoriteCities = [];
        return;
    }
    favoriteCities = JSON.parse(localStorage.getItem('favoriteList'));
    for(let i = 0; i < favoriteCities.length; i++){
        let loader = getFavoriteLoader();
        document.querySelector('ul.favorite').append(loader);
    }
    let weather;
    for (let cityID of favoriteCities) {
        try {
            weather = await getWeatherByID(cityID);
        } catch (err) {
            removeFavoriteLoader('Не удалось получить информацию');
        }
        if (weather.cod >= 300) {
            removeFavoriteLoader('Не удалось получить информацию');
        } else {
            let cityCard = createCityCardFavorite(weather);
            document.querySelector('ul.favorite').replaceChild(cityCard, document.querySelector('ul.favorite li.loader'));
        }
    }
}

function createCityCardFavorite(weather) {
    let card = document.getElementById('favorite_city_card').content.cloneNode(true);

    card.querySelector('li').setAttribute('data-city_id', weather.id);
    card.querySelector('h3').innerHTML = weather.name;
    card.querySelector('span.temperature').insertAdjacentHTML('afterbegin', weather.main.temp);
    card.querySelector('div.icon-weather').classList.add(`weather_${weatherIdToIcon(weather.weather[0].id)}`);
    card.querySelector('input').addEventListener('click', deleteCity);
    let item;
    for (item of cityInfoItems(weather)) {
        card.querySelector('ul.weather-info').append(item);
    }

    return card;
}

function deleteCity(event) {
    let cityCard = event.target.closest('li');
    let cityID = Number(cityCard.getAttribute('data-city_id'));
    for (let i = 0; i < favoriteCities.length; i++) {
        if (favoriteCities[i] === cityID) {
            favoriteCities.splice(i, 1);
            break;
        }
    }
    cityCard.remove();
    localStorage.setItem('favoriteList', JSON.stringify(favoriteCities));
}
