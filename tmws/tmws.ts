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
import { WindowManager } from './WindowManager'

const pixR = window.devicePixelRatio ? window.devicePixelRatio : 1

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTimeSinceMidnight() {
  const midnight = new Date().setHours(0, 0, 0, 0)
  const currentTime = new Date().getTime()
  const timeDiff = (currentTime - midnight) / 1000

  return timeDiff
}

function setupScene(
  camera: OrthographicCamera,
  scene: Scene,
  world: Object3D,
  renderer: WebGLRenderer
) {
  camera.position.z = 2.5

  scene.background = new Color(0.0)
  scene.add(camera)
  scene.add(world)

  renderer.setPixelRatio(pixR)
  renderer.domElement.setAttribute('id', 'scene')

  document.body.appendChild(renderer.domElement)
}

function setupWindowManager(windowManager: WindowManager, world: Object3D) {
  windowManager.setWinShapeChangeCallback(updateWindowShape)
  windowManager.setWinChangeCallback(updateNumberOfCubes)

  // here you can add your custom metadata to each windows instance
  const metaData = { foo: 'bar' }

  // this will init the windowmanager and add this window to the centralised pool of windows
  windowManager.init(metaData)

  // call update windows initially (it will later be called by the win change callback)
  updateNumberOfCubes(windowManager, world)
}

function updateNumberOfCubes(windowManager: WindowManager, world: Object3D) {
  const wins = windowManager.getWindows()
  let cubes: Mesh[] = []
  // remove all cubes
  cubes.forEach((c) => {
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

function updateWindowShape(
  easing = true,
  sceneOffsetTarget: { x: number; y: number },
  sceneOffset: { x: number; y: number }
) {
  // storing the actual offset in a proxy that we update against in the render function
  sceneOffsetTarget = { x: -window.screenX, y: -window.screenY }
  if (!easing) sceneOffset = sceneOffsetTarget
  return sceneOffset
}

function render(
  camera: OrthographicCamera,
  windowManager: WindowManager,
  sceneOffsetTarget: { x: number; y: number },
  sceneOffset: { x: number; y: number },
  world: Object3D,
  cubes: Mesh[],
  renderer: WebGLRenderer,
  scene: Scene
) {
  const t = getTimeSinceMidnight()

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
  requestAnimationFrame(() => {
    render(
      camera,
      windowManager,
      sceneOffsetTarget,
      sceneOffset,
      world,
      cubes,
      renderer,
      scene
    )
  })
}

// resize the renderer to fit the window size
function resize(camera: OrthographicCamera, renderer: WebGLRenderer) {
  const width = window.innerWidth
  const height = window.innerHeight

  camera = new OrthographicCamera(0, width, 0, height, -10000, 10000)
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

export default function main() {
  const clear = new URLSearchParams(window.location.search).has('clear')
  if (clear) localStorage.clear()

  const camera = new OrthographicCamera(
    0,
    0,
    window.innerWidth,
    window.innerHeight,
    -10000,
    10000
  )
  const scene = new Scene()
  const world = new Object3D()
  const windowManager = new WindowManager()
  const renderer = new WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
  })
  const sceneOffset = { x: 0, y: 0 }
  const sceneOffsetTarget = { x: 0, y: 0 }
  const cubes: Mesh[] = []
  const initProps = {
    camera,
    scene,
    world,
    renderer,
    windowManager,
    sceneOffset,
    sceneOffsetTarget,
    cubes,
  }
  let initialized = false
  // this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' && !initialized) {
      initialized = true
      init(initProps)
    }
  })

  window.onload = () => {
    if (document.visibilityState != 'hidden') {
      initialized = true
      init(initProps)
    }
  }
}

function init({
  camera,
  scene,
  world,
  renderer,
  windowManager,
  sceneOffset,
  sceneOffsetTarget,
  cubes,
}: {
  camera: OrthographicCamera
  scene: Scene
  world: Object3D
  renderer: WebGLRenderer
  windowManager: WindowManager
  sceneOffset: { x: number; y: number }
  sceneOffsetTarget: { x: number; y: number }
  cubes: Mesh[]
}) {
  // add a short timeout because window.offsetX reports wrong values before a short period
  setTimeout(() => {
    setupScene(camera, scene, world, renderer)
    setupWindowManager(windowManager, world)
    resize(camera, renderer)
    updateWindowShape(false, sceneOffsetTarget, sceneOffset)
    render(
      camera,
      windowManager,
      sceneOffsetTarget,
      sceneOffset,
      world,
      cubes,
      renderer,
      scene
    )
    window.addEventListener('resize', () => {
      resize(camera, renderer)
    })
  })
}