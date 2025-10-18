document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    // Views
    const guestView = document.getElementById('guest-view');
    const userView = document.getElementById('user-view');
    const userNameElem = document.getElementById('user-name');
    const logoutLink = document.getElementById('logout-link');

    // Date Elements
    const dateInput = document.getElementById('current-date');
    const prevDayButton = document.getElementById('prev-day');
    const nextDayButton = document.getElementById('next-day');

    // Meal Elements
    const lunchMenuElem = document.getElementById('lunch-menu');
    const dinnerMenuElem = document.getElementById('dinner-menu');

    // Like Elements
    const likeButtons = document.querySelectorAll('.like-button');
    const lunchLikeCountElem = document.getElementById('lunch-like-count');
    const dinnerLikeCountElem = document.getElementById('dinner-like-count');

    // Nutrition Elements
    const orplcInfoElem = document.getElementById('orplc-info');
    const calInfoElem = document.getElementById('cal-info');
    const ntrInfoElem = document.getElementById('ntr-info');
    const allergyInfoElem = document.getElementById('allergy-info');

    // Class Schedule Elements
    const weeklyScheduleTableBody = document.getElementById('schedule-table-body');
    const currentWeekRangeElem = document.getElementById('current-week-range');
    const prevWeekButton = document.getElementById('prev-week');
    const nextWeekButton = document.getElementById('next-week');
    const scheduleMessageElem = document.getElementById('schedule-message');

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatWeekRange = (startDate) => {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 4); // Friday
        return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
    };

    const getMonday = (date) => {
        const day = date.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(date);
        monday.setDate(diff);
        return monday;
    };

    let currentMealDate = new Date();
    let currentScheduleDate = getMonday(new Date()); // Initialize to current week's Monday

    const checkAuthStatus = async () => {
        if (!token) {
            guestView.style.display = 'block';
            userView.style.display = 'none';
            document.querySelectorAll('.like-section').forEach(el => el.style.display = 'none');
            return;
        }

        const response = await fetch('/api/user', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();

        if (response.ok && data.logged_in) {
            userNameElem.textContent = data.name;
            userView.style.display = 'block';
            guestView.style.display = 'none';
            document.querySelectorAll('.like-section').forEach(el => el.style.display = 'flex');
        } else {
            localStorage.removeItem('token');
            guestView.style.display = 'block';
            userView.style.display = 'none';
            document.querySelectorAll('.like-section').forEach(el => el.style.display = 'none');
        }
    };

    const fetchWeeklyClassSchedule = async (date) => {
        scheduleMessageElem.textContent = '시간표 로딩 중...';
        weeklyScheduleTableBody.innerHTML = ''; // Clear previous schedule

        const mondayOfCurrentWeek = getMonday(new Date(date)); // Ensure we always start from Monday
        const start_date_str = formatDate(mondayOfCurrentWeek).replace(/-/g, '');

        if (!token) {
            scheduleMessageElem.textContent = '로그인이 필요합니다.';
            return;
        }

        try {
            const response = await fetch(`/api/schedule?start_date=${start_date_str}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            console.log('API /api/schedule response:', data); // Add this line for debugging

            if (response.ok) {
                scheduleMessageElem.textContent = ''; // Clear loading message
                currentWeekRangeElem.textContent = formatWeekRange(mondayOfCurrentWeek);

                const weeklySchedule = data.weekly_schedule;
                const maxPeriods = 7; // Assuming max 7 periods per day

                for (let p = 1; p <= maxPeriods; p++) {
                    const row = document.createElement('tr');
                    const periodCell = document.createElement('td');
                    periodCell.textContent = `${p}교시`;
                    row.appendChild(periodCell);

                    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday"];
                    dayNames.forEach(day => {
                        const subjectCell = document.createElement('td');
                        subjectCell.textContent = weeklySchedule[day][p - 1] || ''; // p-1 because array is 0-indexed
                        row.appendChild(subjectCell);
                    });
                    weeklyScheduleTableBody.appendChild(row);
                }
            } else {
                scheduleMessageElem.textContent = data.error || '주간 시간표 정보를 불러오지 못했습니다.';
            }
        } catch (error) {
            console.error('Error fetching weekly schedule:', error);
            scheduleMessageElem.textContent = '주간 시간표 정보를 불러오는 중 오류가 발생했습니다.';
        }
    };

    const fetchAllMealAndNutritionData = (date) => {
        fetchMealData(date);
        fetchNutritionData(date);
        if (token) {
            fetchLikeData(date);
        }
    };

    const fetchMealData = async (date) => {
        const dateString = formatDate(date).replace(/-/g, '');
        const response = await fetch(`/api/meal?date=${dateString}`);
        const data = await response.json();
        lunchMenuElem.textContent = data.lunch || '정보 없음';
        dinnerMenuElem.textContent = data.dinner || '정보 없음';
        dateInput.value = formatDate(date);
    };

    const fetchNutritionData = async (date) => {
        const dateString = formatDate(date).replace(/-/g, '');
        const response = await fetch(`/api/nutrition?date=${dateString}`);
        const data = await response.json();
        if(response.ok) {
            orplcInfoElem.innerHTML = data.ORPLC_INFO || '정보 없음';
            calInfoElem.innerHTML = data.CAL_INFO || '정보 없음';
            ntrInfoElem.innerHTML = data.NTR_INFO || '정보 없음';
            allergyInfoElem.textContent = data.allergy || '정보 없음'; // Allergy info is plain text
        } else {
            orplcInfoElem.innerHTML = '정보 없음';
            calInfoElem.innerHTML = '정보 없음';
            ntrInfoElem.innerHTML = '정보 없음';
            allergyInfoElem.textContent = '정보 없음';
        }
    };

    const fetchLikeData = async (date) => {
        const dateString = formatDate(date).replace(/-/g, '');
        // Lunch
        const lunchResp = await fetch(`/api/get_like_count?date=${dateString}&meal_type=lunch`, { headers: { 'Authorization': `Bearer ${token}` } });
        const lunchData = await lunchResp.json();
        if(lunchResp.ok) updateLikeUI('lunch', lunchData.like_count, lunchData.user_has_liked);
        // Dinner
        const dinnerResp = await fetch(`/api/get_like_count?date=${dateString}&meal_type=dinner`, { headers: { 'Authorization': `Bearer ${token}` } });
        const dinnerData = await dinnerResp.json();
        if(dinnerResp.ok) updateLikeUI('dinner', dinnerData.like_count, dinnerData.user_has_liked);
    };

    const updateLikeUI = (mealType, count, hasLiked) => {
        const countElem = mealType === 'lunch' ? lunchLikeCountElem : dinnerLikeCountElem;
        const button = document.querySelector(`.like-button[data-meal-type="${mealType}"]`);
        countElem.textContent = count;
        if(hasLiked) {
            button.classList.add('liked');
            button.innerHTML = '<i class="fas fa-thumbs-up"></i>';
        } else {
            button.classList.remove('liked');
            button.innerHTML = '<i class="far fa-thumbs-up"></i>';
        }
    };

    likeButtons.forEach(button => {
        button.addEventListener('click', async () => {
            if (!token) return alert('로그인이 필요합니다.');
            const mealType = button.dataset.mealType;
            const dateString = formatDate(currentMealDate).replace(/-/g, ''); // Use currentMealDate
            const response = await fetch('/api/submit_like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ date: dateString, meal_type: mealType })
            });
            if(response.ok) fetchLikeData(currentMealDate); // Use currentMealDate
        });
    });

    // Event Listeners for date changes (for meal/nutrition)
    prevDayButton.addEventListener('click', () => {
        currentMealDate.setDate(currentMealDate.getDate() - 1);
        fetchAllMealAndNutritionData(currentMealDate);
    });

    nextDayButton.addEventListener('click', () => {
        currentMealDate.setDate(currentMealDate.getDate() + 1);
        fetchAllMealAndNutritionData(currentMealDate);
    });

    dateInput.addEventListener('change', (e) => {
        const newDate = new Date(e.target.value + 'T00:00:00');
        currentMealDate = newDate;
        fetchAllMealAndNutritionData(currentMealDate);
    });

    // Event Listeners for week changes (for schedule)
    prevWeekButton.addEventListener('click', () => {
        currentScheduleDate.setDate(currentScheduleDate.getDate() - 7); // Go back a week
        fetchWeeklyClassSchedule(currentScheduleDate);
    });

    nextWeekButton.addEventListener('click', () => {
        currentScheduleDate.setDate(currentScheduleDate.getDate() + 7); // Go forward a week
        fetchWeeklyClassSchedule(currentScheduleDate);
    });

    if(logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.reload();
        });
    }

    // View More button functionality for nutrition info
    const viewMoreBtn = document.querySelector('.view-more-btn');
    if(viewMoreBtn) {
        viewMoreBtn.addEventListener('click', function() {
            const content = this.previousElementSibling; // The .collapsible-content
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                this.textContent = '더보기';
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                this.textContent = '숨기기';
            }
        });
    }

    // Initial Load
    checkAuthStatus();
    fetchAllMealAndNutritionData(currentMealDate);
    fetchWeeklyClassSchedule(currentScheduleDate);
});
