const serverLink = 'http://localhost:3000';

const dirRange = 22.5;
const fullCircle = 360;
const directions = [
    "северный", "северо-северо-восточный", "северо-восточный", "восточно-северо-восточный",
    "восточный", "восточно-юго-восточный", "юго-восточный", "юго-юго-восточный",
    "южный", "юго-юго-западный", "юго-западный", "западно-юго-западный",
    "западный", "западно-северо-западный", "северо-западный", "северо-северо-западный"];
const defaultCityID = 498817;

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
    input.value = '';
    let loader = getFavoriteLoader();
    document.querySelector('ul.favorite').append(loader);
    let weatherRequest;
    try {
        weatherRequest = await addFavoriteCity(cityName);
        if (!weatherRequest.success) {
            removeFavoriteLoader(weatherRequest.payload);
            return;
        }
        if (weatherRequest.duplicate) {
            removeFavoriteLoader('Город уже в списке');
            return;
        }
        let weather = weatherRequest.payload;
        document.querySelector('ul.favorite').replaceChild(createCityCardFavorite(weather), document.querySelector('ul.favorite li.loader'));
    } catch (err) {
        removeFavoriteLoader('Не удалось получить информацию');
    }
}

async function getWeather(url, method = 'GET') {
    try {
        const response = await fetch(url, {
            method: method,
            credentials: 'include'
        });
        return await response.json();
    } catch (error) {
        return { success: false, payload: error };
    }
}

function degreesToDirection(degrees) {
    if(degrees < 0 || degrees > fullCircle) {
        return null;
    }
    let diff;
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
    let weatherRequest;
    try {
        weatherRequest = await getWeatherByCoords(position.coords.latitude, position.coords.longitude);
        if (!weatherRequest.success) {
            insertHereError(error);
        } else {
            weather = weatherRequest.payload;
            document.querySelector('.here').replaceChild(createCityCardHere(weather), document.querySelector('.here .loader'));
        }
    } catch (err) {
        insertHereError(error);
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
    let weatherRequest;
    try {
        weatherRequest = await getWeatherDefault();
        if (!weatherRequest.success) {
            insertHereError(error);
        } else {
            weather = weatherRequest.payload;
            let cityCard = createCityCardHere(weather);
            document.querySelector('.here').replaceChild(cityCard, document.querySelector('.here .loader'));
        }
    } catch (err) {
        insertHereError(error);
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

function getWeatherByName(cityName) {
    let requestURL = serverLink + '/weather/city?q=' + encodeURI(cityName);
    return getWeather(requestURL);
}

function getWeatherDefault() {
    let requestURL = serverLink + '/weather/'+ encodeURI(defaultCityID);
    return getWeather(requestURL);
}

function getWeatherByCoords(latitude, longitude) {
    let requestURL = serverLink + '/weather/coordinates?lat=' + encodeURI(latitude) + '&lon=' + encodeURI(longitude);
    return getWeather(requestURL);
}

function getFavoriteWeatherList() {
    let requestURL = serverLink + '/favourites';
    return getWeather(requestURL);
}

function getWeatherByID(cityID) {
    let requestURL = serverLink + '/weather/' + encodeURI(cityID);
    return getWeather(requestURL);
}

function addFavoriteCity(cityName) {
    let requestURL = serverLink + '/favourites/' + encodeURI(cityName);
    return getWeather(requestURL, 'POST');
}

function deleteFavoriteCity(cityID) {
    let requestURL = serverLink + '/favourites/' + encodeURI(cityID);
    return getWeather(requestURL, 'DELETE');
}

async function loadFavorites() {
    let weatherRequest;
    try {
        let weatherResponse = await getFavoriteWeatherList();
        if (!weatherResponse.success) {
            alert('Не удалось получить список избранных городов');
            return;
        }
        let favoriteCities = weatherResponse.payload;
        for (let i = 0; i < favoriteCities.length; i++) {
            let loader = getFavoriteLoader();
            document.querySelector('ul.favorite').append(loader);
        }
        let weather;
        for (let cityID of favoriteCities) {
            try {
                weatherRequest = await getWeatherByID(cityID);
                if (!weatherRequest.success) {
                    removeFavoriteLoader(weatherRequest.payload);
                } else {
                    weather = weatherRequest.payload;
                    let cityCard = createCityCardFavorite(weather);
                    document.querySelector('ul.favorite').replaceChild(cityCard, document.querySelector('ul.favorite li.loader'));
                }
            } catch (err) {
                removeFavoriteLoader('Не удалось получить информацию');
            }
        }
    } catch (error) {
        alert('Не удалось получить список избранных городов');
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

async function deleteCity(event) {
    let cityCard = event.target.closest('li');
    let cityID = Number(cityCard.getAttribute('data-city_id'));
    let response;
    try {
        response = await deleteFavoriteCity(cityID);
        if (response.success) {
            cityCard.remove();
        } else {
            alert('Не удалось удалить город');
        }
    } catch (error) {
        alert(error);
    }
}
