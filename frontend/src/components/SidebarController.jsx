import { useEffect } from 'react'

export default function SidebarController(){
  useEffect(()=>{
    // on mount, emit current sidebar state so pages can sync
    const sidebarInit = document.querySelector('.sidebar')
    if (sidebarInit) {
      const initState = { collapsed: sidebarInit.classList.contains('collapsed'), open: sidebarInit.classList.contains('open') }
      window.dispatchEvent(new CustomEvent('sidebar:state', { detail: initState }))
    }
    function toggleSidebarForScreen() {
      const sidebar = document.querySelector('.sidebar')
      if(!sidebar) return
      if (window.innerWidth >= 992) {
        sidebar.classList.toggle('collapsed')
        // ensure mobile open removed
        sidebar.classList.remove('open')
      } else {
        sidebar.classList.toggle('open')
      }
      // emit event with current state so React components can sync
      const state = { collapsed: sidebar.classList.contains('collapsed'), open: sidebar.classList.contains('open') }
      window.dispatchEvent(new CustomEvent('sidebar:state', { detail: state }))
    }

    function onClick(e){
      const btn = e.target.closest && e.target.closest('.mobile-toggle')
      if(btn) {
        e.preventDefault()
        toggleSidebarForScreen()
      }
    }

    function onResize(){
      const sidebar = document.querySelector('.sidebar')
      if(!sidebar) return
      // if resized to large screens, ensure open overlay removed
      if(window.innerWidth >= 992){
        sidebar.classList.remove('open')
      }
    }

    document.addEventListener('click', onClick)
    window.addEventListener('resize', onResize)
    return ()=>{
      document.removeEventListener('click', onClick)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return null
}
