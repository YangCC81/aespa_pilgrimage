    /**
 * 根據 URL 網址判斷顯示類型
 * @param {string} url - 來源網址
 * @returns {string} - 顯示的文字和符號
 */
function getUrlDisplayType(url) {
    if (url.includes('instagram.com')) {
        return '🔗 IG 貼文';
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return '▶️ YouTube';
    }
    return '🌐 外部';
}
// =================================================================
// 全域變數：追蹤排序狀態 
// =================================================================
let currentSortOrder = 'newest'; // 'newest' 或 'oldest'

// =================================================================
// 建立 Google Maps 導航 URL 
// =================================================================
function createNavigationUrl(lat, lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * 綁定輪播容器的點擊事件
 */
function bindCarouselEvents() {
    document.querySelectorAll('.image-carousel').forEach(carousel => {
        carousel.addEventListener('click', (event) => {
            event.stopPropagation(); 
            
            const locationIndex = parseInt(carousel.dataset.locationIndex);
            const locationData = locationsData[locationIndex];
            const imageUrls = locationData.ig_img_urls;
            
            if (imageUrls.length <= 1) return; 

            let currentIndex = parseInt(carousel.dataset.currentImg);
            
            currentIndex = (currentIndex + 1) % imageUrls.length;
            
            const imgElement = carousel.querySelector('img');
            imgElement.src = imageUrls[currentIndex];
            
            carousel.dataset.currentImg = currentIndex;
        });
    });
}

// =================================================================
// 成員顏色定義
// =================================================================
const MEMBER_INFO = {
    "Karina": { color: "blue", symbol: "💙" }, 
    "Giselle": { color: "pink", symbol: "🌙" }, 
    "Winter": { color: "white", symbol: "⭐" }, 
    "Ningning": { color: "purple", symbol: "🦋" }, 
    "Default": { color: "orange", symbol: "🔮" } 
};

// =================================================================
// 1. 數據宣告
// =================================================================
let locationsData = [];

// =================================================================
// 2. Google Maps 初始化與標記功能
// =================================================================
let map;
let infoWindow; 

async function loadDataAndInitMap() {
    try {
        const response = await fetch('locations.json'); 
        locationsData = await response.json(); 

        infoWindow = new google.maps.InfoWindow(); 
        const bounds = new google.maps.LatLngBounds(); 
        const initialCenter = { lat: 35.6762, lng: 139.6503 }; 
        
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 10,
            center: initialCenter,
            mapTypeId: 'roadmap',
            styles: [
                { featureType: "poi", stylers: [{ visibility: "off" }] },
                { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] }
            ]
        });
        
        locationsData.forEach(location => {
            addMarker(location);
            bounds.extend({ lat: location.lat, lng: location.lng });
        });
        
        if (locationsData.length > 0) {
            if (locationsData.length === 1) {
                map.setCenter({ lat: locationsData[0].lat, lng: locationsData[0].lng });
                map.setZoom(12);
            } else {
                map.fitBounds(bounds);
            }
        }
        
        google.maps.event.trigger(map, 'resize');
        
        document.getElementById('location-count').textContent = locationsData.length;
        renderSidebarList();
        initFilters(); 

    } catch (error) {
        console.error("❌ 載入數據或初始化地圖失敗！", error);
    }
}

function getMemberInfo(members) {
    if (members.length === 1) {
        const member = members[0].trim();
        return MEMBER_INFO[member] || MEMBER_INFO.Default;
    }
    return MEMBER_INFO.Default;
}

function addMarker(location) {
    const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map,
        title: location.name
    });

    const imageUrls = location.ig_img_urls || [];
    const firstImageUrl = imageUrls.length > 0 ? imageUrls[0] : '';
    const isImageValid = firstImageUrl && firstImageUrl !== '請自行尋找照片 URL';
    
    const membersWithSymbols = location.members.map(member => {
        const info = MEMBER_INFO[member.trim()] || MEMBER_INFO.Default;
        return `${info.symbol} ${member.trim()}`;
    }).join('<br>'); 
    
    const navUrl = createNavigationUrl(location.lat, location.lng);

    marker.addListener("click", () => {
        
        const content = `
            <div class="info-window-content">
                
                ${isImageValid 
                    ? `<img src="${firstImageUrl}" alt="${location.name} 預覽圖" style="max-width: 250px; height: auto; margin-bottom: 10px; border-radius: 4px;">`
                    : ''}
                
                <h4>${location.name}</h4>
                <div class="info-window-line"><strong>成員：</strong><br> ${membersWithSymbols}</div> 
                <div class="info-window-line"><strong>發文日期：</strong> ${location.date}</div>
                <div class="info-window-line"><strong>備註：</strong> ${location.note}</div> 
            </div>
        `;
        
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
        
        const cardElement = document.getElementById(`card-${location.lat}-${location.lng}`);
        if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
    
    location.marker = marker;
}

// =================================================================
// 3. 側邊欄列表渲染
// =================================================================
function renderSidebarList() {
    const listContainer = document.getElementById('locations-list');
    listContainer.innerHTML = ''; 

    locationsData.forEach((location, index) => { 
        if (location.marker && !location.marker.getVisible()) {
            return;
        }

        const card = document.createElement('div');
        card.id = `card-${location.lat}-${location.lng}`; 
        card.className = 'location-card';
        
        const symbolsArray = location.members.map(member => {
            const info = getMemberInfo([member]);
            return info.symbol;
        });
        const symbolDisplay = symbolsArray.join(' '); 

        const imageUrls = location.ig_img_urls || [];
        const firstImageUrl = imageUrls.length > 0 ? imageUrls[0] : '';
        const isImageValid = firstImageUrl && firstImageUrl !== '請自行尋找照片 URL';
        
        // 處理多個來源網址
        const sourceUrlString = location.ig_post_url || '';
        // 拆分字串為陣列，並清理空格
        const sourceUrls = sourceUrlString.split(',').map(url => url.trim()).filter(url => url); 
        
        // 根據來源類型生成連結 HTML (只有當 URL 有效時才生成)
        const sourceLinksHTML = sourceUrls.map((url, i) => {
            const displayType = getUrlDisplayType(url);
            return `<a class="card-link" href="${url}" target="_blank">${displayType}</a>`;
        }).join(''); 
        
        // 外部導航 URL (即使沒有來源連結，導航連結通常也應顯示，因為座標是有的)
        const navUrl = createNavigationUrl(location.lat, location.lng);
        
        card.style.display = 'flex';

        card.innerHTML = `
            <div class="card-text-content">
                <strong>${symbolDisplay} ${location.name}</strong><br> 
                <div class="card-line">${location.country} ${location.city}</div>
                <div class="card-line">成員: ${location.members.join(', ')}</div> 
                <div class="card-line">發文日期: ${location.date}</div>
                <div class="card-line">備註: ${location.note}</div>
                
                <div style="margin-top: 6px;">
                    ${sourceLinksHTML ? sourceLinksHTML : ''}
                    <a class="card-link" href="${navUrl}" target="_blank" >📍 導航</a>
                </div>
            </div>
            
            ${isImageValid 
                ? `
                <div 
                    class="image-carousel" 
                    data-location-index="${index}" 
                    data-current-img="0"
                    style="position: relative; cursor: pointer;"
                >
                    <img 
                        src="${imageUrls[0]}" 
                        alt="${location.name} 預覽圖"
                        style="width: 100%; height: 100%; object-fit: cover;"
                    >
                    <span style="position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.6); color: white; padding: 2px 5px; border-radius: 3px; font-size: 1.3vw;">
                        ${imageUrls.length} 張
                    </span>
                </div>
                ` 
                : ''}
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('.image-carousel')) {
                return; 
            }
            
            google.maps.event.trigger(location.marker, 'click');

            map.setCenter(location.marker.getPosition());
            map.setZoom(14); 
        });

        listContainer.appendChild(card);
    });
    
    bindCarouselEvents();
}

// =================================================================
// 4. 篩選功能 (包含日期排序)
// =================================================================

// 切換排序狀態函式
function toggleSortOrder() {
    // 反轉排序狀態
    currentSortOrder = currentSortOrder === 'newest' ? 'oldest' : 'newest';
    
    const button = document.getElementById('toggle-sort-button');
    
    // 更新按鈕文字
    if (currentSortOrder === 'newest') {
        button.textContent = '↓ 最新發文日期';
        button.style.backgroundColor = '#f7a300';
    } else {
        button.textContent = '↑ 最舊發文日期';
        button.style.backgroundColor = '#4CAF50';
    }

    // 重新執行篩選和排序
    filterLocations();
}


function getAllMembers() {
    const allMembers = new Set();
    locationsData.forEach(location => {
        location.members.forEach(member => {
            allMembers.add(member.trim());
        });
    });
    return Array.from(allMembers).sort();
}

function populateCountryFilter() {
    const countryFilter = document.getElementById('country-filter');
    countryFilter.innerHTML = '<option value="">所有國家</option>';

    const uniqueCountries = [...new Set(locationsData.map(loc => loc.country))].sort();

    uniqueCountries.forEach(country => {
        if (country) {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        }
    });
    
    populateCityFilter(''); 
}

function populateCityFilter(country) {
    const cityFilter = document.getElementById('city-filter');
    cityFilter.innerHTML = '<option value="">所有地區/城市</option>'; 

    let locationsToFilter = locationsData;
    
    if (country) {
        locationsToFilter = locationsData.filter(loc => loc.country === country);
    }
    
    const uniqueCities = [...new Set(locationsToFilter.map(loc => loc.city))].sort();

    uniqueCities.forEach(city => {
        if (city) {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            cityFilter.appendChild(option);
        }
    });
}

function handleCountryChange() {
    const selectedCountry = document.getElementById('country-filter').value;
    populateCityFilter(selectedCountry);
    filterLocations();
}

function resetFilters() {
    document.getElementById('member-filter').value = 'All';
    document.getElementById('country-filter').value = ''; 
    document.getElementById('city-filter').value = ''; 
    
    // 重設日期排序狀態
    currentSortOrder = 'newest';
    const button = document.getElementById('toggle-sort-button');
    button.textContent = '↓ 最新發文日期';
    button.style.backgroundColor = '#f7a300';
    
    populateCityFilter('');
    
    filterLocations();
}

function initFilters() {
    const memberFilter = document.getElementById('member-filter');
    const members = getAllMembers();
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        memberFilter.appendChild(option);
    });
    
    memberFilter.addEventListener('change', filterLocations);
    
    // 確保按鈕在初始化時顯示正確的預設狀態
    document.getElementById('toggle-sort-button').textContent = '↓ 最新發文日期';
    
    populateCountryFilter(); 
    
    filterLocations();
}

function filterLocations() {
    const selectedMember = document.getElementById('member-filter').value;
    const selectedCountry = document.getElementById('country-filter').value;
    const selectedCity = document.getElementById('city-filter').value;
    // 獲取全域變數中的排序狀態
    const dateSortOrder = currentSortOrder; 

    // 1. 應用排序 (改變 locationsData 的排列順序)
    locationsData.sort((a, b) => {
        // 清理日期字串：將 'YYYY年MM月DD日' 格式轉換為 'YYYY/MM/DD'
        const cleanedDateA = a.date.replace(/年|月/g, '/').replace(/日/g, '');
        const cleanedDateB = b.date.replace(/年|月/g, '/').replace(/日/g, '');
        
        const dateA = new Date(cleanedDateA);
        const dateB = new Date(cleanedDateB);

        if (isNaN(dateA) || isNaN(dateB)) {
            return 0;
        }

        if (dateSortOrder === 'oldest') {
            return dateA - dateB; // 最舊的日期在前
        } else {
            return dateB - dateA; // 最新的日期在前
        }
    });

    let visibleCount = 0;
    infoWindow.close();


    // 2. 應用可見性篩選 (決定哪些 Marker 要顯示)
    locationsData.forEach(location => {
        const memberMatch = (selectedMember === 'All') || location.members.includes(selectedMember);
        const countryMatch = !selectedCountry || location.country === selectedCountry;
        const cityMatch = !selectedCity || location.city === selectedCity;
        
        const shouldShow = memberMatch && countryMatch && cityMatch;
        
        location.marker.setVisible(shouldShow);
        
        if (shouldShow) {
            visibleCount++;
        }
    });
    
    document.getElementById('location-count').textContent = visibleCount;
    
    // 3. 重新渲染側邊欄清單 (根據新的排序和可見性)
    renderSidebarList();
}

// =================================================================
// 5. 載入 Google Maps 函式庫 
// =================================================================
const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDGZujGgC207RjOC7AkNsAj4EmCQWkPt68&callback=loadDataAndInitMap`; 
script.async = true;
document.head.appendChild(script);

window.loadDataAndInitMap = loadDataAndInitMap;
