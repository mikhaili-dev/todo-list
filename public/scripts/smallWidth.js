import { getCoords, getMetrics, isItTouchEvent, getEventForTouch, isCursorInsideWindow, getPreviousPlaceholder, isMouseBtnLeft } from "./commonFunctions.js"
import { changeColumnHandler } from "./changeColumn.js"

/*В этом файле описан режим работы сайта, 
действующий при ширине дисплея, 
не превосходящей 600px 
*/

window.addEventListener('resize', () => {

    
    if (!isWindowWidthSmallEnough()) return 
    
    setClickEvents()
    intialDisable()
})
window.addEventListener('load', () => {
    if (!isWindowWidthSmallEnough()) return 

    intialDisable()
    setClickEvents()
})

function intialDisable() {                                                          //При подгрузке страницы (или при изменении масштаба) по умолчанию активной будет первая колонка
    const secondNThirdImg = document.querySelectorAll('.header:not(:first-of-type) img')
    const firstImg = document.querySelector('header img')

    activateBtn(firstImg)
    shiftPlaceholders("first-column")
    
    secondNThirdImg.forEach(image => {
        image.classList.add("disabled")
    })

}
function setClickEvents() {
    const images = document.querySelectorAll('header img')

    images.forEach(img => {
        img.addEventListener('click', activateColumn)
    })
}
function activateColumn(event) {
    const btn = event.target
    const prevBtn = document.querySelector('img.active')
    const columnName = btn.classList[0]

    if (btn === prevBtn) return

    activateBtn(btn, prevBtn)
    shiftPlaceholders(columnName)
}
function activateBtn(btn, prevBtn) {
    if (prevBtn) {
        prevBtn.classList.remove('active')
        prevBtn.classList.add('disabled')
    }

    btn.classList.remove('disabled')
    btn.classList.add('active')
}
function shiftPlaceholders(columnName) {
    const firstPlaceholder = document.querySelector('.placeholder:nth-of-type(1)')
    const secondPlaceholder = document.querySelector('.placeholder:nth-of-type(2)')
    const thirdPlaceholder = document.querySelector('.placeholder:nth-of-type(3)')

    if (columnName === 'first-column') {
        firstPlaceholder.style.left = '0vw'
        secondPlaceholder.style.left = '100vw'
        thirdPlaceholder.style.left = '200vw'
    }
    if (columnName === 'second-column') {
        firstPlaceholder.style.left = '-100vw'
        secondPlaceholder.style.left = '0vw'
        thirdPlaceholder.style.left = '100vw'
    }
    if (columnName === 'third-column') {
        firstPlaceholder.style.left = '-200vw'
        secondPlaceholder.style.left = '-100vw'
        thirdPlaceholder.style.left = '0vw'
    }
}
function grabNoteWithSmallWindowHandler(eventDown, note) {                                              //Эта функция вызывается из app.js
    if (isItTouchEvent(eventDown)) {                                                                    //при событиях touchstart и mousedown
        eventDown = getEventForTouch(eventDown)                                                         //при ширине дисплея, не большей 600px

    } else if (!isMouseBtnLeft(eventDown)) return

    const currentColumnName = getCurrentColumn(note)
    const {noteX, noteY, cursorX: initialCursorX} = getCoords(eventDown, note)
    const {windowWidth, windowHeight, noteWidth, noteHeight} = getMetrics(note)

    const notePlug = getPlugForNote({note, noteHeight, noteWidth, currentColumnName})

    const shiftX = initialCursorX - noteX

    const prevPlaceholder = getPreviousPlaceholder(note)

    note.replaceWith(notePlug)

    turnOnNoteDraggedMode({note, noteWidth, currentColumnName})

    moveNoteAtInitialPosition(note, noteX, noteY)

    window.addEventListener('mousemove', moveNoteHandler)
    window.addEventListener('touchmove', moveNoteHandler, {passive: false})

    window.addEventListener('mouseup', mouseUpHandler)
    window.addEventListener('touchend', mouseUpHandler)

    function moveNoteHandler(eventMove) {
        if (isItTouchEvent(eventMove)) {
            eventMove = getEventForTouch(eventMove)
        }

        moveNoteOnXCoord(eventMove)
    }
    function moveNoteOnXCoord(eventMove) {
        const {cursorX, cursorY} = getCoords(eventMove)
        const noteX = cursorX - shiftX

        if (!isCursorInsideWindow({cursorX, cursorY, windowWidth, windowHeight})) return mouseUpHandler({clientX: cursorX})

        const correctNoteX = getCorrectNoteXCoord({noteX, windowWidth, noteWidth})                                          //Делаем, чтобы note не выдвигалась за экран при перемещении
    
        note.style.left = correctNoteX + 'px'
    }

    function mouseUpHandler(eventUp) {
        if (isItTouchEvent(eventUp)) {
            eventUp = getEventForTouch(eventUp)
        }

        let cursorX = eventUp.clientX

        window.removeEventListener('mousemove', moveNoteHandler)
        window.removeEventListener('touchmove', moveNoteHandler)

        window.removeEventListener('mouseup', mouseUpHandler)
        window.removeEventListener('touchend', mouseUpHandler)

        releaseNoteHandler(note, notePlug, cursorX)
    }

    function releaseNoteHandler(note, notePlug, cursorX) {
        turnOffNoteDraggedMode({note, currentColumnName})

        if (isChangeColumnNeeded({initialCursorX, cursorX, windowWidth})) {
            const direction = whereToShiftNote({initialCursorX, cursorX})

            notePlug.remove()

            const newColumnName = getNewColumn(currentColumnName, direction)

            const newPlaceholder = getNewPlaceholder(newColumnName)

            changeColumnHandler(note, prevPlaceholder, newPlaceholder)

            const list = newPlaceholder.querySelector('ul')

            list.prepend(note)

            return
            
        } else {
            notePlug.replaceWith(note)
        }
    }
}
function getCurrentColumn(note) {
    const listWrapper = note.closest('.list-wrapper')
    const column = listWrapper.classList[1]

    return column
}
function turnOnNoteDraggedMode({note, noteWidth, currentColumnName}) {
    note.style.width = noteWidth + 'px'                                 //При перестаскивании фиксирую ширину заметки во время перекладывания в body, так как по умолчанию у li размер родителя ul, и без указания точного размера li уменьшится до длины текста

    note.classList.add('dragged', currentColumnName)
    document.body.append(note)
}
function turnOffNoteDraggedMode({note, currentColumnName}) {
    note.classList.remove('dragged', currentColumnName)
    note.style.top = ''
    note.style.left = ''
    note.style.width = ''
}
function moveNoteAtInitialPosition(note, noteX, noteY) {
    note.style.left = noteX + 'px'
    note.style.top = noteY + 'px'
}
function isChangeColumnNeeded({initialCursorX, cursorX, windowWidth}) {
    const minimalShift = windowWidth * 0.2                                  //Для изменения колонки сдвиг курсора должен составлять по крайней мере 20% от ширины экрана
    const actualShift = Math.abs(initialCursorX - cursorX)

    if (actualShift >= minimalShift) return true

    return false
}
function whereToShiftNote({initialCursorX, cursorX}) {
    const isShiftPositive = initialCursorX - cursorX > 0                    //Был сдвиг вправо или влево можно отличить в зависимости от того, больше или меньше начальное положение курсора от текущего положения
    let direction;

    if (isShiftPositive) direction = 'LEFT'                                 //Если начальное пложение больше -- сдвигаем влево          
    else direction = 'RIGHT'

    return direction
}
function getNewColumn(currentColumnName, direction) {
    let newColumnName;

    if (direction === 'RIGHT') {
        if (currentColumnName === 'first-column') newColumnName = 'second-column'
        if (currentColumnName === 'second-column') newColumnName = 'third-column'
        if (currentColumnName === 'third-column') newColumnName = 'first-column'
    } else if (direction === 'LEFT') {
        if (currentColumnName === 'first-column') newColumnName = 'third-column'
        if (currentColumnName === 'second-column') newColumnName = 'first-column'
        if (currentColumnName === 'third-column') newColumnName = 'second-column'
    }
    return newColumnName
}
function getNewPlaceholder(columnName) {
    const column = document.querySelector(`.${columnName}:not(img)`)

    const placeholder = column.closest('.placeholder')

    return placeholder
}
function getCorrectNoteXCoord({noteX, windowWidth, noteWidth}) {
    let correctNoteX = noteX

    if (noteX < 0) correctNoteX = 0
    else if (noteX + noteWidth > windowWidth) correctNoteX = windowWidth - noteWidth

    return correctNoteX
}
function getPlugForNote({note, noteHeight, noteWidth, currentColumnName}) {
    const plug = note.cloneNode(false)

    plug.style.width = noteWidth + 'px'
    plug.style.height = noteHeight + 'px'

    const [img1, img2] = getImgs(currentColumnName)                         //В зависимости от колонки, в которой находится передвигаемая заметка, будут отображаться разный значки других оклонок

    plug.append(img1, img2)

    setPlugClass(plug, currentColumnName)

    return plug
}
function setPlugClass(plug, columnName) {
    switch (columnName) {
        case 'first-column':
            plug.classList.add('first-column-plug')
            break;
        case 'second-column': 
            plug.classList.add('second-column-plug')
            break;
        case 'third-column': 
            plug.classList.add('third-column-plug')
    }
}
function getImgs(columnName) {
    let img1 = document.createElement('img')
    let img2 = document.createElement('img')
    let src1, src2

    switch (columnName) {
        case 'first-column':
            src1 = '../images/loading(30x30).png'
            src2 = '../images/checkmark(30x30).png'
            break;
        case 'second-column':
            src1 = '../images/checkmark(30x30).png'
            src2 = '../images/bullet-list(30x30).png'
            break;
        case 'third-column':
            src1 = '../images/bullet-list(30x30).png'
            src2 = '../images/loading(30x30).png'
    }

    img1.setAttribute('src', src1)
    img2.setAttribute('src', src2) 

    return [img1, img2]
}
function isWindowWidthSmallEnough() {
    const windowWidth = document.documentElement.clientWidth

    if (windowWidth > 600) return false

    return true
}
export {grabNoteWithSmallWindowHandler}