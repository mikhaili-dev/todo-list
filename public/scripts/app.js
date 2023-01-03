import { getCoords, getMetrics, isItTouchEvent, getEventForTouch, isCursorInsideWindow, shiftCurrentColumnNotes, saveNote, getPreviousPlaceholder, isMouseBtnLeft } from "./commonFunctions.js"
import { changeColumnHandler } from "./changeColumn.js"
import { grabNoteWithSmallWindowHandler } from "./smallWidth.js"

const openFormBtn = document.querySelector('.open-form-btn')
const deleteNotesBtn = document.querySelector('.delete-notes-btn')
const closeFormBtn = document.querySelector('.close-form-btn')
const saveNoteBtn = document.querySelector('.modal button')
const modalWindow = document.querySelector('.modal')
const textInput = document.querySelector('input[type=text]')
const warning = document.querySelector('.warning-message')

window.addEventListener('load', () => {
    loadNotes()

    offDragEventsOnImages()
})

openFormBtn.addEventListener('click', openForm)

closeFormBtn.addEventListener('click', closeForm)

window.addEventListener('keydown', pressKeyHandler)

textInput.addEventListener('input', hideWarning)                //Убираем warning о пустой строке, если было что-то введено

saveNoteBtn.addEventListener('click', newNoteHandler)

deleteNotesBtn.addEventListener('click', deleteCompletedNotesHandler)

function openForm() {
    hideWarning()                                               //Если была попытка отправить пустую строку, активируется showWarning - поэтому на всякий случай убиаем warning при каждом открытии формы

    modalWindow.classList.add('active')

    textInput.focus()
}

function closeForm() {
    modalWindow.classList.remove('active')

    clearInput()
}
function pressKeyHandler(event) {
    const key = event.key

    if (key === 'Esc' || key === 'Escape') closeForm()
}
function newNoteHandler(event) {
    event.preventDefault()

    const text = textInput.value

    if (!text) return showWarning()

    const key = Date.now()
    const column = 'first-column'                               //Все новые элементы попадают в первую колонку с классом first-column
    const ordinalNumber = 1                                     //Элемент становится первым в списке. Такая нумерация используется,
    const noteObj = {text, column, ordinalNumber}               //чтобы в правильном порядке загружать заметки из localStorage при перезагрузке страницы

    shiftCurrentColumnNotes(column)                             //Сдвигаем ordinalNumber других элементов для правильного порядка загрузки

    saveNote(key, noteObj)

    prependNote(key, noteObj)

    closeFormBtn.click()

    clearInput()
}

function createDOMNote(key, {text, time, duration}) {           //Такой формат параметров нужен для удобной загрузки элементов из localStorage при загрузке страницы
    const note = document.createElement('li')
    const p = document.createElement('p')
    const tagTime = document.createElement('time')
    const durationSpan = document.createElement('span')

    p.textContent = text;

    if (time) {                                                 //В зависимости от колонки у note может: не быть ни time, ни duration (I); быть time (II); быть duration (III)
        tagTime.textContent = time
        note.prepend(tagTime) 
    }

    if (duration) {
        durationSpan.textContent = duration
        note.prepend(durationSpan)
    }
    note.prepend(p)

    note.setAttribute('data-key', key)                          //По ключю будем сохранять в localStorage, чтобы потом была возможность найти элемент из DOM в localStorage и наоборот

    setDragEvent(note)

    return note
}
function clearInput() {
    textInput.value = ''
}
function setDragEvent(note) {
    note.addEventListener('mousedown', (event) => grabNoteHandler(event, note))
    note.addEventListener('touchstart', (event) => grabNoteHandler(event, note))                    //сохраняем note, так как в touch-events не предусмотрены свойства .target и .currentTarget
}
function grabNoteHandler(eventDown, note) {
    const {noteWidth, noteHeight, windowWidth, windowHeight} = getMetrics(note)
    
    if (windowWidth <= 600) {
        return grabNoteWithSmallWindowHandler(eventDown, note)
    }

    if (isItTouchEvent(eventDown)) {                                                                     //Если устройство с touch, из него требуется иначе достать нужные свойства
        eventDown = getEventForTouch(eventDown)

    } else if (!isMouseBtnLeft(eventDown)) return                                                        //Отменяем обработку события, если оно вызвано не левой кнопкой мыши
    
    if (windowHeight <= 850) pullOutNewNotePlugs()

    const {cursorX, cursorY, noteX, noteY} = getCoords(eventDown, note)
    
    const prevPlaceholder = getPreviousPlaceholder(note)

    const notePlug = getPlugForNote(note, noteHeight, noteWidth)

    const shiftX = cursorX - noteX
    const shiftY = cursorY - noteY

    hideButtons()
    showNewNotePlug(prevPlaceholder)

    note.replaceWith(notePlug)

    turnOnNoteDraggedMode(note, noteWidth)

    moveNoteAtPoint(eventDown)

    note.addEventListener('mouseup', mouseUpHandler)
    note.addEventListener('touchend', mouseUpHandler)

    window.addEventListener('mousemove', moveNoteHandler)
    window.addEventListener('touchmove', moveNoteHandler, {passive: false})                             //passive: false (для touchmove по умолчанию true) позволяет сделать preventDefault(), чтобы при перетакивании не проматывался экран
    

    function moveNoteHandler(eventMove) {
        if (isItTouchEvent(eventMove)) {
            eventMove.preventDefault()                                                                  //отключаем прокртку страницы при перетаскивании элемента
            eventMove = getEventForTouch(eventMove)
        }
        note.style.display = 'none'                                                                     //Отключаем на момент дисплей, чтобы корректно сработало document.elementFromPoint()
        const currentPlaceholder = getCurrentPlaceholder({x: eventMove.clientX, y: eventMove.clientY})
        note.style.display = ''

        currentPlaceholder ? showNewNotePlug(currentPlaceholder) : hideNewNotePlugs()                   //Если под элементом есть placeholder - показать значок добавления 
        
        moveNoteAtPoint(eventMove)
    }

    function moveNoteAtPoint(event) {
        const {cursorX, cursorY} = getCoords(event)

        if (!isCursorInsideWindow({cursorX, cursorY, windowWidth, windowHeight})) return mouseUpHandler() //Если курсор вышел за пределы страницы -- реагируем как на отжатие клавиши мыши

        const noteX = cursorX - shiftX
        const noteY = cursorY - shiftY

        const {correctNoteX, correctNoteY} = getCorrectNoteCoords({noteX, noteY, windowWidth, windowHeight, noteWidth, noteHeight})

        note.style.left = correctNoteX + 'px'
        note.style.top = correctNoteY + 'px'
    }

    function mouseUpHandler(eventUp) {
        let cursorX, cursorY;

        if (eventUp) {                                              //eventUp может не быть, так как эта функция запускается не только из addEventListener, но и вручную, если курсор вышел за границы экрана
            if (isItTouchEvent(eventUp)) {
                eventUp = getEventForTouch(eventUp)
            }
            cursorX = eventUp.clientX
            cursorY = eventUp.clientY
        } else {
            cursorX = -1                                            //Если eventUp нету, то есть запущен вручную из-за выхода курсора за экран, то ставим такие координаты, чтобы под ними точно не было placeholder
            cursorY = -1
        }
        window.removeEventListener('mousemove', moveNoteHandler)
        window.removeEventListener('touchmove', moveNoteHandler)

        note.removeEventListener('mouseup', mouseUpHandler)
        note.removeEventListener('touchend', mouseUpHandler)

        compressNewNotePlugs()

        releaseNoteHandler(note, notePlug, {x: cursorX, y: cursorY}, prevPlaceholder)
    }
}
function turnOnNoteDraggedMode(note, noteWidth) {
    note.style.width = noteWidth + 'px'                                 //При перестаскивании фиксирую ширину заметки во время перекладывания в body, так как по умолчанию у li размер родителя ul, и без указания точного размера li уменьшится до длины текста

    note.classList.add('dragged')
    document.body.append(note)
}
function turnOffNoteDraggedMode(note) {
    note.classList.remove('dragged')
    note.style.top = ''
    note.style.left = ''
    note.style.width = ''
}
function getCorrectNoteCoords({noteX, noteY, windowWidth, windowHeight, noteWidth, noteHeight}) {
    let [correctNoteX, correctNoteY] = [noteX, noteY]

    if (noteX < 0) correctNoteX = 0
    else if (noteX + noteWidth > windowWidth) correctNoteX = windowWidth - noteWidth

    if (noteY < 0) correctNoteY = 0
    else if (noteY + noteHeight > windowHeight) correctNoteY = windowHeight - noteHeight

    return {correctNoteX, correctNoteY}
}
function releaseNoteHandler(note, notePlug, {x, y}, prevPlaceholder) {
    note.style.display = 'none'
    const newPlaceholder = getCurrentPlaceholder({x, y})
    note.style.display = ''

    turnOffNoteDraggedMode(note)

    hideNewNotePlugs()
    showButtons()

    if (!newPlaceholder || (prevPlaceholder === newPlaceholder)) {              //Если на момент отклика элемент не находится над плейсхолдером или плейсхолдер тот же,
        return notePlug.replaceWith(note)                                       //возвращаем его на прежнее место, ставя вместо элемента, заполнявшего его место
    } else {
        notePlug.remove()
    }

    const list = newPlaceholder.querySelector('ul')

    changeColumnHandler(note, prevPlaceholder, newPlaceholder)

    list.prepend(note)
}
function getPlugForNote(note, noteHeight, noteWidth) {
    const plug = note.cloneNode(false)

    plug.style.height = noteHeight + 'px'
    plug.style.width = noteWidth + 'px'

    plug.classList.add('note-plug')

    return plug
}
function loadNotes() {
    const notesCount = localStorage.length

    const sortedNotes = []

    for (let i = 0; i <= notesCount; i++) {
        const key = localStorage.key(i)

        if (!key) continue

        const noteJSON = localStorage.getItem(key)
        const noteObj = JSON.parse(noteJSON)

        if (!noteObj) continue

        sortedNotes.push({key, noteObj})

    }
    sortedNotes.sort((a, b) => {                                                            //Если загружать элементы без сортировки, то их порядок в колонках будет определяться
        return b.noteObj.ordinalNumber - a.noteObj.ordinalNumber                            //не их порядком до обновления страницы, а тем, в каком порядке они были добавлены в localStorage
    })                                                                                      //из-за чего порядок заметок до и после обновления страницы будет отличаться. Для корректной сортировки используется
    sortedNotes.forEach(({key, noteObj}) => prependNote(key, noteObj))                    
}
function prependNote(key, noteObj) {
    const noteDOM = createDOMNote(key, noteObj)

    const list = document.querySelector(`.${noteObj.column} > ul`)

    if (!list) return

    list.prepend(noteDOM)
}

function getCurrentPlaceholder({x, y}) {
    const deepestElem = document.elementFromPoint(x, y)

    const placeholder = deepestElem ? deepestElem.closest('.placeholder') : null

    return placeholder
}

function hideButtons() {
    const btnContainers = document.querySelectorAll('.btn-container')

    btnContainers.forEach(container => {
        container.classList.add('hidden')
    })
    // openFormBtn.classList.add('hidden')
    // deleteNotesBtn.classList.add('hidden')
}
function showButtons() {
    const btnContainers = document.querySelectorAll('.btn-container')

    btnContainers.forEach(container => {
        container.classList.remove('hidden')
    })
    // openFormBtn.classList.remove('hidden')
    // deleteNotesBtn.classList.remove('hidden')
}

function showNewNotePlug(placeholder) {
    hideNewNotePlugs()

    const plug = placeholder.querySelector('.new-note-plug')

    plug.classList.add('active')
}
function hideNewNotePlugs() {
    const placeholders = document.querySelectorAll('.placeholder')

    placeholders.forEach((placeholder) => {
        const plug = placeholder.querySelector('.new-note-plug')

        plug.classList.remove('active')
    })
}

function deleteCompletedNotesHandler() {
    const completedColumn = document.querySelector('.third-column:not(img)')
    const completedNotes = completedColumn.querySelectorAll('li')
    
    completedNotes.forEach(note => {
        deleteFromLocalStorage(note)

        note.remove()
    })
}
function deleteFromLocalStorage(note) {
    const key = note.getAttribute('data-key')

    localStorage.removeItem(key)
}

function showWarning() {
    warning.classList.add('active')
}
function hideWarning() {
    warning.classList.remove('active')
}

function offDragEventsOnImages() {                                                      //Чтобы не было встроенного в браузер эффекта перетаскивания картинки
    const images = document.querySelectorAll('img')

    images.forEach(img => {
        img.addEventListener('dragstart', (event) => event.preventDefault())
    })
}
function pullOutNewNotePlugs() {
    const newNotePlugs = document.querySelectorAll('.new-note-plug')
    
    newNotePlugs.forEach(plug => {
        plug.classList.add('long')
    })
}
function compressNewNotePlugs() {
    const newNotePlugs = document.querySelectorAll('.new-note-plug')
    
    newNotePlugs.forEach(plug => {
        plug.classList.remove('long')
    })
}