import { shiftCurrentColumnNotes, getNoteObj, saveNote } from "./commonFunctions.js";

/*
    Эта функция (и её подфункции) была вынесена в отдельный файл по двум причинам:
1. Она выполняет определённую, чётко обозначаемую работу -- меняет колонку, и притом она занимает много строк
2. Она используется и в app.js, и в low-width.js
*/
function changeColumnHandler(draggedNote, prevPlaceholder, newPlaceholder) {        //При смене колонки нужно:
    const key = draggedNote.getAttribute('data-key')                                //1. Взять объект нужной заметки из localStorage, изменить в нём свойство column и удалить или добавить свойства time или duration (в зависимости от колонки)
    const noteJSON = localStorage.getItem(key)                                      //2. Отобразить эти изменения, обновив DOM заметку
    const noteObj = JSON.parse(noteJSON)                                            //3. Сохранить изменённый объект в localStorage для корректного отображения заметок после обновления страницы

    const newColumnName = newPlaceholder.querySelector('div').className.split(' ')[1];    //Номер колонны записан во втором классе
    const prevColumnName = prevPlaceholder.querySelector('div').className.split(' ')[1];

    const noteObjWithFeatures = getNoteObjWithFeatures(noteObj, newColumnName)      //Добавляем в объект поле, которое придусмотренно колонкой, в которую его переместили

    const clearedNoteObj = getClearedNoteObj(noteObjWithFeatures, newColumnName)    //Удаляем ненужные свойства, оставшиеся с прошлых колонок
    
    updateDOMNote(clearedNoteObj, newColumnName, draggedNote)

    shiftCurrentColumnNotes(newColumnName)                                          //Сдвигаем другие заметки той же колонки вперёд, чтобы при загрузе элементы имели правильный порядок
    shiftPrevColumnNotes(draggedNote, prevColumnName)                               //Также сдевигаем элементы прошлый колонки

    saveNote(key, clearedNoteObj)                                                   //Сохраняем в localStorage обновлённый объект, чтобы изменения действовали и после перезагрузки страницы
}
function getNoteObjWithFeatures(noteObj, columnName) {    
    noteObj.column = columnName
    noteObj.ordinalNumber = 1                                                       //При смене колонки элемент становится первым в списке

    switch (columnName) {
        case 'second-column':
            noteObj.timestamp = Date.now()                                          //Добавляем timestamp, чтобы можно было посчитать длительность выполнения при добавлении из II в III колонку 
            noteObj.time = getTime(noteObj.timestamp)                               //Фиксируем текущее время для отображения его во второй колонке в теге time

            break
        case 'third-column':
            if (!noteObj.timestamp) {                                               //Если timestamp отсутствует, то есть заметка перемещена из I в III,
                noteObj.duration = getDuration(0)                                   //то длительность посчитаем за 0мс
            } else {
                noteObj.duration = getDuration((Date.now() - Number(noteObj['timestamp']))) //Если timestamp есть - вычисляем длительность выполнения с помощью прошлого и текущего timestamp
            }
    }
    return noteObj
}
function getClearedNoteObj(noteObj, columnName) {
    switch (columnName) {
        case 'first-column':
            delete noteObj.timestamp
            delete noteObj.time
            delete noteObj.duration

            break
        case 'second-column': 
            delete noteObj.duration

            break
        case 'third-column':
            delete noteObj.timestamp
            delete noteObj.time
    }
    return noteObj
}
function updateDOMNote(noteObj, columnName, draggedNote) {
    switch (columnName) {
        case 'first-column':
            firstColumnHandler(draggedNote)
            break
        case 'second-column': 
            secondColumnHandler(noteObj.time, draggedNote)
            break
        case 'third-column':
            thirdColumnHandler(noteObj.duration, draggedNote)
    }
}
function firstColumnHandler(draggedNote) {
    const durationSpan = draggedNote.querySelector('span')
    const timeTag = draggedNote.querySelector('time')

    if (durationSpan) durationSpan.remove()
    if (timeTag) timeTag.remove()
}
function secondColumnHandler(time, draggedNote) {
    const durationSpan = draggedNote.querySelector('span')
    const prevTagTime = draggedNote.querySelector('time')

    if (prevTagTime) return                                             //Если элемент снова добавляется в ту же колонку -- не добавляем ещё раз время, а пользуемся прошлым

    if (durationSpan) durationSpan.remove()

    const timeTag = document.createElement('time')

    timeTag.textContent = time

    draggedNote.append(timeTag)
}
function thirdColumnHandler(duration, draggedNote) {
    const timeTag = draggedNote.querySelector('time')

    if (timeTag) timeTag.remove()

    const span = document.createElement('span')

    span.textContent = duration

    draggedNote.append(span)
}

function getTime(timestamp) {
    const hours = String(new Date(timestamp).getHours())
    const minutes = String(new Date(timestamp).getMinutes())

    const formattedTime = getCorrectTimeFormat([hours, minutes])

    return formattedTime
}
function getDuration(ms) {
    let secondsTotal = Math.trunc(ms / 1000)
    let minutesTotal = Math.trunc(secondsTotal / 60)

    let seconds = String(Math.trunc(secondsTotal % 60))                                  //получаем секунды без учёта содержавшихся в них шестидесяток, чтобы они корректно отображались с минутами 
    let minutes = String(Math.trunc(minutesTotal % 60))                                  //то же и для минут с часами
    let hours = String(Math.trunc(minutesTotal / 60))

    const formattedTime = getCorrectTimeFormat([hours, minutes, seconds])

    return formattedTime
}
function getCorrectTimeFormat(timeValues) {
    const formatedTimeValues = [];

    timeValues.forEach((timeValue, index) => {
        timeValue = (timeValue.length === 1) ? `0${timeValue}` : timeValue

        if (index !== timeValues.length - 1) timeValue += ':'

        formatedTimeValues.push(timeValue)
    })

    const timeStr = formatedTimeValues.join('')

    return timeStr
}
function shiftPrevColumnNotes(note, prevColumn) {
    const ordinalNumber = getOrdinalNumber(note)

    const notesCount = localStorage.length
    
    for (let i = 0; i <= notesCount; i++) {
        const key = localStorage.key(i)

        if (!key) continue

        const noteJSON = localStorage.getItem(key)
        const noteObj = JSON.parse(noteJSON)

        if (!noteObj) continue

        const columnOfCurrentElem = noteObj.column
        const currentElemOrdinalNumber = noteObj.ordinalNumber

        if ((columnOfCurrentElem === prevColumn) && (currentElemOrdinalNumber > ordinalNumber)) {
            const newNoteObj = {...noteObj, ordinalNumber: --noteObj.ordinalNumber}         //сдвигаем назад порядкоый номер у элементов предыдущей колонки, чтобы поддежривать порядок

            const newNoteJSON = JSON.stringify(newNoteObj)

            localStorage.setItem(key, newNoteJSON)
        }
    }
}
function getOrdinalNumber(note) {
    const noteObj = getNoteObj(note)

    return noteObj.ordinalNumber
}

export {changeColumnHandler}