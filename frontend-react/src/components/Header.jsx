import { useState } from 'react';

export default function Header({ onMenuClick }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    return (
        <header id="header" className="header">
            <div className="hdr-cntr hdr-cntr-top">
                <div id="header-top-container" className="hdr-second container-90">
                    <div className="social-links">
                        <ul className="left social-links">
                            <li><a target="_blank" href="#"><i className="fa fa-x-twitter"></i></a></li>
                            <li><a target="_blank" href="#"><i className="fa fa-youtube"></i></a></li>
                            <li><a target="_blank" href="#"><i className="fa fa-instagram"></i></a></li>
                        </ul>
                    </div>
                    
                    <a className="suppots-btns" href="#">
                        <i className="fa fa-gift"></i> PROMOÇÕES
                    </a>
                    <a className="suppots-btns" href="#">
                        <i className="fa fa-life-ring"></i> SUPORTE
                    </a>
                    
                    <form className="login-form">
                        <div className="hdr-login">
                            <div className="flex-container">
                                <div className="hdr-input-wrapper flex-container">
                                    <div className="input-wrapper flex-item">
                                        <input type="text" className="validate browser-default input-item" placeholder="Usuario, e-mail, telefone ou CPF" />
                                    </div>
                                    <div className="input-wrapper flex-item">
                                        <input type="password" className="validate browser-default input-item" placeholder="Senha" />
                                    </div>
                                </div>
                                <div className="sign-in-wrapper">
                                    <button className="hdr-login-btn sign-in-btn">Login</button>
                                </div>
                                <div className="register-wrapper">
                                    <a href="#" className="hdr-login-btn register-btn">CADASTRAR-SE</a>
                                </div>
                                <a className="forgot-password" href="#">Esqueci a senha</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            
            <div className="hdr-cntr">
                <div className="hdr-second-wrapper left">
                    <div id="menu-wrapper" className="hdr-second container-90">
                        <a name="logo" className="lg-cntr left brand-logo logo-shadow" href="#">
                            <div className="lg-icon"><i className="fa fa-futbol"></i></div>
                            <span className="lg-text">BetSave</span>
                        </a>
                        
                        <button className="header-menu-btn" onClick={onMenuClick}>
                            <i className="fa fa-bars"></i>
                        </button>
                        
                        <div className="mn-menu left">
                            <ul className="clear">
                                <li>
                                    <a href="#" className="active">
                                        <span className="material-symbols-outlined">timer</span> ESPORTES
                                    </a>
                                </li>
                                <li>
                                    <a href="#">
                                        <span className="material-symbols-outlined">stream</span> APOSTAS AO VIVO
                                    </a>
                                </li>
                                <li>
                                    <a href="#">
                                        <span className="material-symbols-outlined">casino</span> CASSINO
                                    </a>
                                </li>
                                <li>
                                    <a href="#">
                                        <span className="material-symbols-outlined">memory</span> CASSINO AO VIVO
                                    </a>
                                </li>
                                <li>
                                    <a href="#">
                                        <i className="fa fa-plane pg-icons"></i>
                                        <span className="menu-new-item">Hot</span> AVIATOR
                                    </a>
                                </li>
                                <li>
                                    <a href="#">
                                        <i className="fa fa-fighter-jet pg-icons"></i>
                                        <span className="menu-new-item">Novo</span> JETX
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
