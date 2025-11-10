Date.prototype.addDays = function (days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

// Streamer ID set during site generation
const STREAMER_ID = "29";
const API_BASE_URL = "https://crud.eri.bot";

let countdown;
let streams = [];
let streamNowEle = document.getElementById("streamNow");
let streamCountdownEle = document.getElementById("streamCountdown");
let updateCountdownTimer;
let gridSchedule = document.getElementById("gridSchedule");

// Day names for convenience
const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

function updateCountdownCheck() {
  let now = Date.now();
  let timerSet = false;

  for (let i = 0; i < streams.length; i++) {
    let soonestStream = streams[i];
    let streamDate = Date.parse(soonestStream.date);
    let delta = streamDate - now;

    if (delta > 0) {
      streamNowEle.hidden = true;
      streamCountdownEle.hidden = false;
      renderStreamCountdown(delta);
      timerSet = true;
    } else if (delta + 1000 * 60 * soonestStream.duration > 0) {
      streamCountdownEle.hidden = true;
      streamNowEle.hidden = false;
      timerSet = true;
    }

    if (timerSet) break;
  }

  if (!timerSet) {
    streamCountdownEle.hidden = true;
    streamNowEle.hidden = true;
    console.log("No upcoming streams found.");
    clearInterval(updateCountdownTimer);
  }
}

function renderStreamCountdown(datetime) {
  const days = Math.floor(datetime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((datetime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((datetime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((datetime % (1000 * 60)) / 1000);

  let printString = "";
  if (days > 0) printString += `${days}:`;
  printString += `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  countdown.innerHTML = printString;
}

async function fetchStreamsFromAPI() {
  try {
    if (!STREAMER_ID) {
      console.error("Streamer ID not set");
      return [];
    }

    const url = `${API_BASE_URL}/getWeek/${STREAMER_ID}`;
    console.log(`Fetching streams from ${url}`);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch streams: ${response.status}`);

    const data = await response.json();
    console.log("API Response:", data);

    if (data && data.data) return data.data;
    console.error("Unexpected API response format:", data);
    return [];
  } catch (error) {
    console.error("Error fetching streams:", error);
    return [];
  }
}

function formatDateTime(streamDate) {
  let t = streamDate.split(/[- :]/);
  let dayHourSplit = t[2].split("T");

  let date = new Date(
    Date.UTC(t[0], t[1] - 1, dayHourSplit[0], dayHourSplit[1], t[3], 0)
  );

  return {
    day: date.toLocaleDateString('en-US', { weekday: 'long' }),
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    datetime: date
  };
}

function updateStreamGrid(streamData) {
  const headerRow = gridSchedule.querySelector('.gridRow:first-child');
  gridSchedule.innerHTML = '';
  gridSchedule.appendChild(headerRow);

  const streamsByDay = {};

  if (streamData && streamData.length > 0) {
    streamData = streamData.sort((a, b) => parseInt(a.stream_date) - parseInt(b.stream_date));

    streamData.forEach(stream => {
      const { day, date, time, datetime } = formatDateTime(stream.streamDate);

      if (!streamsByDay[day]) streamsByDay[day] = [];

      streamsByDay[day].push({
        name: stream.streamName,
        time: time,
        date: date,
        datetime: datetime,
        duration: stream.duration || 120
      });

      streams.push({
        stream: stream.streamName,
        date: datetime,
        duration: stream.duration || 120
      });
    });
  }

  const today = new Date();
  const currentDayIndex = today.getDay();

  for (let i = 0; i < 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const dayName = DAYS_OF_WEEK[dayIndex];

    const thisDate = new Date(today);
    thisDate.setDate(today.getDate() + i);
    const formattedDate = `${thisDate.getMonth() + 1}/${thisDate.getDate()}`;

    const dayStreams = streamsByDay[dayName] || [];

    let chosen_stream = null;
    dayStreams.forEach((stream) => {
      if (stream.datetime.getMonth() !== thisDate.getMonth() || stream.datetime.getDate() !== thisDate.getDate()) return;
      chosen_stream = stream;
    });

    if (chosen_stream) {
      const streamRow = document.createElement("div");
      streamRow.className = "gridRow";
      streamRow.innerHTML = `
        <div class="scheduleDay">${dayName}</div>
        <div class="scheduleDate">${chosen_stream.date}</div>
        <div class="scheduleStream">
          <a href="https://twitch.tv/Syrin_Hemlock" target="_blank">${chosen_stream.name}</a> at ${chosen_stream.time}
        </div>
      `;
      gridSchedule.appendChild(streamRow);
    } else {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'gridRow';
      emptyRow.innerHTML = `
        <div class="scheduleDay">${dayName}</div>
        <div class="scheduleDate">${formattedDate}</div>
        <div class="scheduleStream">No Stream</div>
      `;
      gridSchedule.appendChild(emptyRow);
    }
  }
}

function initializeEmptyGrid() {
  const today = new Date();
  const currentDayIndex = today.getDay();

  const headerRow = gridSchedule.querySelector('.gridRow:first-child');
  gridSchedule.innerHTML = '';
  gridSchedule.appendChild(headerRow);

  for (let i = 0; i < 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const dayName = DAYS_OF_WEEK[dayIndex];

    const thisDate = new Date(today);
    thisDate.setDate(today.getDate() + i);
    const formattedDate = `${thisDate.getMonth() + 1}/${thisDate.getDate()}`;

    const emptyRow = document.createElement('div');
    emptyRow.className = 'gridRow';
    emptyRow.innerHTML = `
      <div class="scheduleDay">${dayName}</div>
      <div class="scheduleDate">${formattedDate}</div>
      <div class="scheduleStream">No Stream</div>
    `;
    gridSchedule.appendChild(emptyRow);
  }
}

window.onload = async function () {
  streamNowEle = document.getElementById("streamNow");
  streamCountdownEle = document.getElementById("streamCountdown");
  countdown = document.getElementById("Countdown");
  gridSchedule = document.getElementById("gridSchedule");

  initializeEmptyGrid();

  const apiStreams = await fetchStreamsFromAPI();

  if (apiStreams && apiStreams.length > 0) {
    streams = [];
    updateStreamGrid(apiStreams);
  }

  streams.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (streams.length > 0) {
    updateCountdownCheck();
    updateCountdownTimer = setInterval(updateCountdownCheck, 1000);
  }
};
