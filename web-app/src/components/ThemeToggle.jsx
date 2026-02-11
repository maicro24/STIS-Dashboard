import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

const ThemeToggle = ({ className = '' }) => {
    const [isDarkMode, setIsDarkMode] = useState(true)

    // Handle the actual HTML class toggling
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark')
            document.documentElement.classList.remove('light')
        } else {
            document.documentElement.classList.remove('dark')
            document.documentElement.classList.add('light')
        }
    }, [isDarkMode])

    return (
        <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`
                p-2.5 rounded-xl 
                bg-slate-100 dark:bg-slate-800 
                hover:bg-slate-200 dark:hover:bg-slate-700
                text-slate-600 dark:text-slate-300
                hover:text-cyan-500 dark:hover:text-cyan-400
                border border-slate-200 dark:border-slate-700
                hover:border-cyan-500/50 dark:hover:border-cyan-400/50
                transition-all duration-300
                shadow-sm hover:shadow-md
                ${className}
            `}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {isDarkMode ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </button>
    )
}

export default ThemeToggle
