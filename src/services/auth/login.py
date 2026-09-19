import streamlit as st
from src.services.persistence.exercise_repository import get_or_create_user


def render_login_page():
    if st.session_state.get("user_id") is not None:
        return True

    st.markdown(
        """
        <div style="padding:1rem 1rem 0.2rem 1rem; text-align:center;">
            <div style="display:inline-block; padding:0.5rem 1rem; margin-bottom:0.8rem; border:1px solid rgba(245,214,123,0.5); background:rgba(201,162,39,0.08); border-radius:999px; color:#f5d67b; letter-spacing:0.12em; font-size:0.7rem; font-weight:600; text-transform:uppercase;">
                GymSense AI 🏋️
            </div>
            <h1 style="margin:0; font-size:2.7rem; line-height:1.1; color:#f3ecdc;">Train Smarter & Stay Stronger 🏋️ </h1>
            <p style="margin:0.8rem auto 0 auto; max-width:640px; color:rgba(243,236,220,0.75); font-size:1rem;">
                👉 Real-time pose analysis, rep tracking & AI coaching for your next workout.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <style>
        .gym-login-shell {
            max-width: 800px;
            margin: 1.1rem auto 0 auto;
            background: linear-gradient(180deg, rgba(22,18,34,0.95), rgba(15,12,18,0.9));
            border: 1px solid rgba(201,162,39,0.35);
            border-radius: 50px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.28);
            padding: 2rem 1.5rem 1.5rem 1.5rem;
        }
        .gym-login-shell .label {
            color: #f5d67b;
            font-size: 0.82rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 0.rem;
            display: block;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    st.markdown('<div class="gym-login-shell">', unsafe_allow_html=True)
    with st.form("login_form", clear_on_submit=False):
        st.markdown(
            '<span class="label">👉 Profile Name</span>', unsafe_allow_html=True
        )
        username = st.text_input(
            "Username",
            placeholder="enter unique name ",
            label_visibility="collapsed",
            help="Use a unique name to track your workout history.",
        )
        st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
        submit_button = st.form_submit_button("Start Session", use_container_width=True)
    st.markdown("</div>", unsafe_allow_html=True)

    if submit_button:
        if not username or not username.strip():
            st.error("Name cannot be empty.")
            return False

        username = username.strip()
        user = get_or_create_user(username)

        st.session_state["user_id"] = user["id"]
        st.session_state["username"] = user["username"]
        st.rerun()
    return False
