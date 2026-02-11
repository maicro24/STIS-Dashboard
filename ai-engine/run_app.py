import os
import sys
import threading
import webbrowser
import http.server
import socketserver
import main  # نستدعي كود الذكاء الاصطناعي الخاص بك

# إعدادات البرنامج
PORT = 8000
WEB_FOLDER = "ui"  # اسم المجلد الذي يحتوي على ملفات الموقع

# كلاس لتشغيل سيرفر الموقع
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # نجبر السيرفر أن يخدم الملفات من مجلد 'ui'
        super().__init__(*args, directory=WEB_FOLDER, **kwargs)
    
    # إخفاء رسائل السيرفر المزعجة من الشاشة السوداء
    def log_message(self, format, *args):
        pass

def start_ai():
    """تشغيل الذكاء الاصطناعي في الخلفية"""
    print("🧠 AI Engine Started...")
    try:
        # تأكد من وجود المجلد قبل البدء
        if not os.path.exists(WEB_FOLDER):
            os.makedirs(WEB_FOLDER)
        main.main()
    except Exception as e:
        print(f"❌ AI Error: {e}")

def start_server():
    """تشغيل الموقع"""
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🌐 STIS Dashboard running at http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    print("🚀 Starting STIS Traffic System...")
    
    # 1. تشغيل الذكاء الاصطناعي في خيط منفصل (Thread)
    ai_thread = threading.Thread(target=start_ai)
    ai_thread.daemon = True 
    ai_thread.start()

    # 2. فتح الموقع في المتصفح تلقائياً
    webbrowser.open(f"http://localhost:{PORT}")

    # 3. تشغيل السيرفر (هذا السطر سيجعل البرنامج يعمل باستمرار)
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n🛑 Stopping System...")