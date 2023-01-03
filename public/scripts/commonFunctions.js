/*
Чтобы не дублировать код, сюда были вставлены 
те функции, что используются в прочих скриптах. 
*/

function getCoords(event, note) {
    let cursorX, cursorY, noteX, noteY = null

    if (event) {
        cursorX = event.clientX
        cursorY = event.clientY
    }
    if (note) {
        noteX = note.getBoundingClientRect().x
        noteY = note.getBoundingClientRect().y
    }
    return {
        cursorX, cursorY,
        noteX, noteY
    }
}
function getMetrics(note) {
    const noteWidth = note.getBoundingClientRect().width
    const noteHeight = note.getBoundingClientRect().height

    const windowWidth = document.documentElement.clientWidth
    const windowHeight = document.documentElement.clientHeight

    return {
        noteWidth, noteHeight,
        windowWidth, windowHeight
    }
}
function isItTouchEvent(event) {
    if (event.changedTouches) return true

    return false
}
function getEventForTouch(event) {
    const correctEvent = event.changedTouches[0]                             //обрабатываем только те touch-events, которые находятся на элементе

    return correctEvent
}
function isCursorInsideWindow({cursorX, cursorY, windowWidth, windowHeight}) {
    if ((cursorX > windowWidth) || (cursorY > windowHeight) || (cursorX < 0) || (cursorY < 0)) {
        return false
    }
    return true
}
function getNoteObj(note) {
    const key = note.getAttribute('data-key')
    const noteJSON = localStorage.getItem(key)
    const noteObj = JSON.parse(noteJSON)

    return noteObj
}
function shiftCurrentColumnNotes(currentColumn) {
    const notesCount = localStorage.length
    
    for (let i = 0; i <= notesCount; i++) {
        const key = localStorage.key(i)

        if (!key) continue

        const noteJSON = localStorage.getItem(key)
        const noteObj = JSON.parse(noteJSON)

        if (!noteObj) continue

        const columnOfCurrentElem = noteObj.column

        if (columnOfCurrentElem === currentColumn) {
            const newNoteObj = {...noteObj, ordinalNumber: ++noteObj.ordinalNumber}         //сдвигаем вперёд порядковый номер у элементов при добавлении в их колонку нового элемента

            const newNoteJSON = JSON.stringify(newNoteObj)

            localStorage.setItem(key, newNoteJSON)
        }
    }
}
function saveNote(key, noteObj) {
    const noteJSON = JSON.stringify(noteObj)

    localStorage.setItem(key, noteJSON)
}
function getPreviousPlaceholder(elem) {
    const placeHolder = elem.closest('.placeholder')

    return placeHolder
}
function isMouseBtnLeft(event) {
    if (event.button === 0) return true

    return false
}
export {
    getCoords, getMetrics, isItTouchEvent, getEventForTouch, isCursorInsideWindow, getNoteObj, shiftCurrentColumnNotes, saveNote, getPreviousPlaceholder, isMouseBtnLeft
}