import os, base64
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components


def resolve_app_path(*parts):
    root = Path(__file__).resolve().parents[2]
    candidate = root.joinpath(*parts)
    if candidate.exists():
        return str(candidate)

    src_candidate = root.joinpath("src", *parts)
    if src_candidate.exists():
        return str(src_candidate)

    return str(candidate)


## CSS Style
def load_css(file_path):
    if os.path.exists(file_path):
        with open(file_path, encoding="utf-8") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)


## Font Style
def inject_local_font(font_path, font_name):
    if not os.path.exists(font_path):
        return

    with open(font_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode()

    ext = os.path.splitext(font_path)[1].lstrip(".")
    fmt = {"otf": "opentype"}.get(ext, ext)
    mime = {"otf": "font/otf"}.get(ext, f"font/{ext}")

    st.markdown(
        f"""
        <style>
        @font-face {{
            font-family: '{font_name}';
            src: url('data:{mime};base64,{encoded}') format('{fmt}');
            font-weight: 100 900;
            font-style: normal;
        }}
        </style>
    """,
        unsafe_allow_html=True,
    )


## Webrtfc Styles
def inject_webrtc_styles():
    font_path = resolve_app_path("src", "static", "AdobeClean.otf")

    if not os.path.exists(font_path):
        return

    with open(font_path, "rb") as font_file:
        encoded_font = base64.b64encode(font_file.read()).decode()

    components.html(
        f"""
        <script>
        (function patchWebRTCStyles() {{
            function injectIntoIframe(iframe) {{
                try {{
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!doc || !doc.head) return;
                    if (doc.head.querySelector('#webrtc-custom-styles')) return;
                    const style = doc.createElement('style');
                    style.id = 'webrtc-custom-styles';
                    style.textContent = `
                        @font-face {{
                            font-family: 'AdobeClean';
                            src: url('data:font/otf;base64,{encoded_font}') format('opentype');
                            font-weight: 100 900;
                            font-style: normal;
                        }}

                        :root {{
                            --bg-dark: #0b0912;
                            --bg-panel: #161222;
                            --accent: #c9a227;
                            --accent-hover: #e7c96a;
                            --text-light: #f3ecdc;
                            --border-subtle: rgba(201, 162, 39, 0.18);
                        }}

                        body {{
                            background: var(--bg-dark) !important;
                            color: var(--text-light) !important;
                        }}

                        .MuiButtonBase-root,
                        .MuiButton-root,
                        .MuiButton-contained,
                        .MuiButton-text {{
                            font-family: 'AdobeClean', sans-serif !important;
                            letter-spacing: 0.05em !important;
                            border-radius: 10px !important;
                            background-color: var(--bg-panel) !important;
                            color: var(--text-light) !important;
                            border: 1px solid var(--border-subtle) !important;
                            text-transform: none !important;
                            padding: 8px 18px !important;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.4) !important;
                            transition: all 0.2s ease-in-out !important;
                        }}

                        .MuiButtonBase-root:hover,
                        .MuiButton-root:hover,
                        .MuiButton-contained:hover,
                        .MuiButton-text:hover {{
                            background-color: var(--accent) !important;
                            color: #0b0912 !important;
                            box-shadow: 0 4px 14px rgba(201, 162, 39, 0.45) !important;
                            transform: translateY(-1px);
                        }}

                        .MuiButtonBase-root:active,
                        .MuiButton-root:active {{
                            transform: translateY(0);
                            box-shadow: 0 2px 6px rgba(0,0,0,0.5) !important;
                        }}

                        .MuiButton-contained {{
                            background: linear-gradient(135deg, var(--accent), var(--accent-hover)) !important;
                            border: none !important;
                            color: #0b0912 !important;
                        }}

                        .MuiPaper-root,
                        .MuiCard-root {{
                            background-color: var(--bg-panel) !important;
                            border: 1px solid var(--border-subtle) !important;
                            border-radius: 12px !important;
                        }}

                        ::-webkit-scrollbar {{
                            width: 8px;
                            height: 8px;
                        }}
                        ::-webkit-scrollbar-thumb {{
                            background: var(--accent);
                            border-radius: 4px;
                        }}
                        ::-webkit-scrollbar-track {{
                            background: var(--bg-panel);
                        }}
                    `;
                    doc.head.appendChild(style);
                }} catch (e) {{
                    console.warn('[patcher] could not inject:', e);
                }}
            }}

            function findAndPatch() {{
                const parentDoc = window.parent.document;
                const iframes = parentDoc.querySelectorAll('iframe');
                iframes.forEach(iframe => {{
                    if (iframe.src && iframe.src.includes('webrtc')) {{
                        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {{
                            injectIntoIframe(iframe);
                        }} else {{
                            iframe.addEventListener('load', () => injectIntoIframe(iframe));
                        }}
                    }}
                }});
            }}

            findAndPatch();
        }})();
        </script>
        """,
        height=0,
    )
