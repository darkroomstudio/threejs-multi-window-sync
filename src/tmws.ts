import {
  OrthographicCamera,
  Scene,
  Color,
  WebGLRenderer,
  Object3D,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
} from 'three'
import WindowManager from './WindowManager.js'

let camera: any, scene: any, renderer: any, world: any
// let near: any, far: any
const pixR = window.devicePixelRatio ? window.devicePixelRatio : 1
let cubes: any = []
let sceneOffsetTarget = { x: 0, y: 0 }
let sceneOffset = { x: 0, y: 0 }

let today: any = new Date()
today.setHours(0)
today.setMinutes(0)
today.setSeconds(0)
today.setMilliseconds(0)
today = today.getTime()

let windowManager: any
let initialized = false

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime() {
  return (new Date().getTime() - today) / 1000.0
}

if (new URLSearchParams(window.location.search).get('clear')) {
  localStorage.clear()
} else {
  // this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState != 'hidden' && !initialized) {
      init()
    }
  })

  window.onload = () => {
    if (document.visibilityState != 'hidden') {
      init()
    }
  }
}
function init() {
  initialized = true

  // add a short timeout because window.offsetX reports wrong values before a short period
  setTimeout(() => {
    setupScene()
    setupWindowManager()
    resize()
    updateWindowShape(false)
    render()
    window.addEventListener('resize', resize)
  }, 500)
}

function setupScene() {
  camera = new OrthographicCamera(
    0,
    0,
    window.innerWidth,
    window.innerHeight,
    -10000,
    10000
  )

  camera.position.z = 2.5
  // near = camera.position.z - 0.5
  // far = camera.position.z + 0.5

  scene = new Scene()
  scene.background = new Color(0.0)
  scene.add(camera)

  renderer = new WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
  })
  renderer.setPixelRatio(pixR)

  world = new Object3D()
  scene.add(world)

  renderer.domElement.setAttribute('id', 'scene')
  document.body.appendChild(renderer.domElement)
}

function setupWindowManager() {
  windowManager = new WindowManager()
  windowManager.setWinShapeChangeCallback(updateWindowShape)
  windowManager.setWinChangeCallback(windowsUpdated)

  // here you can add your custom metadata to each windows instance
  const metaData = { foo: 'bar' }

  // this will init the windowmanager and add this window to the centralised pool of windows
  windowManager.init(metaData)

  // call update windows initially (it will later be called by the win change callback)
  windowsUpdated()
}

function windowsUpdated() {
  updateNumberOfCubes()
}

function updateNumberOfCubes() {
  const wins = windowManager.getWindows()

  // remove all cubes
  cubes.forEach((c: any) => {
    world.remove(c)
  })

  cubes = []

  // add new cubes based on the current window setup
  for (let i = 0; i < wins.length; i++) {
    const win = wins[i]

    const c = new Color()
    c.setHSL(i * 0.1, 1.0, 0.5)

    const s = 100 + i * 50
    const cube = new Mesh(
      new BoxGeometry(s, s, s),
      new MeshBasicMaterial({ color: c, wireframe: true })
    )
    cube.position.x = win.shape.x + win.shape.w * 0.5
    cube.position.y = win.shape.y + win.shape.h * 0.5

    world.add(cube)
    cubes.push(cube)
  }
}

function updateWindowShape(easing = true) {
  // storing the actual offset in a proxy that we update against in the render function
  sceneOffsetTarget = { x: -window.screenX, y: -window.screenY }
  if (!easing) sceneOffset = sceneOffsetTarget
}

function render() {
  const t = getTime()

  windowManager.update()

  // calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
  const falloff = 0.05
  sceneOffset.x =
    sceneOffset.x + (sceneOffsetTarget.x - sceneOffset.x) * falloff
  sceneOffset.y =
    sceneOffset.y + (sceneOffsetTarget.y - sceneOffset.y) * falloff

  // set the world position to the offset
  world.position.x = sceneOffset.x
  world.position.y = sceneOffset.y

  const wins = windowManager.getWindows()

  // loop through all our cubes and update their positions based on current window positions
  for (let i = 0; i < cubes.length; i++) {
    const cube = cubes[i]
    const win = wins[i]
    const _t = t // + i * .2;

    const posTarget = {
      x: win.shape.x + win.shape.w * 0.5,
      y: win.shape.y + win.shape.h * 0.5,
    }

    cube.position.x =
      cube.position.x + (posTarget.x - cube.position.x) * falloff
    cube.position.y =
      cube.position.y + (posTarget.y - cube.position.y) * falloff
    cube.rotation.x = _t * 0.5
    cube.rotation.y = _t * 0.3
  }

  renderer.render(scene, camera)
  requestAnimationFrame(render)
}

// resize the renderer to fit the window size
function resize() {
  const width = window.innerWidth
  const height = window.innerHeight

  camera = new OrthographicCamera(0, width, 0, height, -10000, 10000)
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
