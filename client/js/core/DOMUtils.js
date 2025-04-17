/**
 * DOMUtils.js - Utility functions for DOM operations with InputManager integration
 * 
 * This file provides helper functions to standardize event handling across the codebase,
 * making it easier to use InputManager consistently.
 */

// Namespace for DOM utilities
window.DOMUtils = {
    /**
     * Add event listener with InputManager integration
     * @param {string|Element} target - Element ID, selector string, or DOM element
     * @param {string} eventType - Event type to listen for
     * @param {Function} handler - Event handler function
     * @returns {boolean} - Success status
     */
    addListener(target, eventType, handler) {
        // Determine if this is an ID string, selector, or element
        let element = null;
        let elementId = null;
        
        if (typeof target === 'string') {
            // Check if it's an ID (starts with #)
            if (target.startsWith('#')) {
                elementId = target.substring(1);
                element = document.getElementById(elementId);
            } else {
                // Treat as a selector
                element = document.querySelector(target);
                if (element && element.id) {
                    elementId = element.id;
                }
            }
        } else if (target instanceof Element) {
            element = target;
            elementId = element.id;
        }
        
        // If we couldn't find an element, return false
        if (!element) {
            console.warn(`DOMUtils: Could not find element for "${target}"`);
            return false;
        }
        
        // If the element doesn't have an ID, assign one
        if (!elementId) {
            elementId = `auto-id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            element.id = elementId;
        }
        
        // Check if this is an input-related event that InputManager supports
        const supportedEvents = ['click', 'mousedown', 'mouseup', 'mousemove', 'keydown', 'keyup', 'wheel'];
        
        if (supportedEvents.includes(eventType)) {
            return window.inputManager.registerUIElement(elementId, eventType, handler);
        }
        
        // For events not supported by InputManager, use special handling
        if (eventType === 'contextmenu' || eventType === 'focus' || eventType === 'blur') {
            // These events need direct listeners since InputManager doesn't handle them
            element.addEventListener(eventType, handler);
            console.log(`DOMUtils: Added direct listener for ${eventType} as InputManager doesn't support it`);
            return true;
        }
        
        console.warn(`DOMUtils: Unsupported event type: ${eventType}`);
        return false;
    },
    
    /**
     * Remove event listener with InputManager support
     * @param {string|Element} target - Element ID, selector string, or DOM element
     * @param {string} eventType - Event type to remove
     * @returns {boolean} - Success status
     */
    removeListener(target, eventType) {
        // Determine if this is an ID string, selector, or element
        let element = null;
        let elementId = null;
        
        if (typeof target === 'string') {
            // Check if it's an ID (starts with #)
            if (target.startsWith('#')) {
                elementId = target.substring(1);
                element = document.getElementById(elementId);
            } else {
                // Treat as a selector
                element = document.querySelector(target);
                if (element && element.id) {
                    elementId = element.id;
                }
            }
        } else if (target instanceof Element) {
            element = target;
            elementId = element.id;
        }
        
        // If we couldn't find an element, return false
        if (!element) {
            console.warn(`DOMUtils: Could not find element for "${target}"`);
            return false;
        }
        
        // If we have an element ID, try to unregister
        if (elementId) {
            return window.inputManager.unregisterUIElement(elementId, eventType);
        }
        
        return false;
    },
    
    /**
     * Register global event (document or window level)
     * @param {string} eventType - Event type to listen for
     * @param {Function} handler - Event handler function
     * @returns {boolean} - Success status
     */
    onGlobal(eventType, handler) {
        // For events that InputManager directly supports
        const supportedEvents = ['keydown', 'keyup', 'mousedown', 'mouseup', 'mousemove', 'wheel'];
        
        if (supportedEvents.includes(eventType)) {
            return window.inputManager.on(eventType, handler);
        }
        
        // For DOMContentLoaded (special case)
        if (eventType === 'DOMContentLoaded' || eventType === 'domcontentloaded') {
            // Check if document is already loaded
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
                // Schedule the handler to run asynchronously
                setTimeout(handler, 0);
                return true;
            }
            
            return window.inputManager.on('domcontentloaded', handler);
        }
        
        console.warn(`DOMUtils: Unsupported global event type: ${eventType}`);
        return false;
    },
    
    /**
     * Remove global event handler
     * @param {string} eventType - Event type to remove
     * @param {Function} handler - Event handler function
     * @returns {boolean} - Success status
     */
    offGlobal(eventType, handler) {
        // For events that InputManager directly supports
        const supportedEvents = ['keydown', 'keyup', 'mousedown', 'mouseup', 'mousemove', 'wheel'];
        
        if (supportedEvents.includes(eventType)) {
            return window.inputManager.off(eventType, handler);
        }
        
        // For DOMContentLoaded (special case)
        if (eventType === 'DOMContentLoaded' || eventType === 'domcontentloaded') {
            return window.inputManager.off('domcontentloaded', handler);
        }
        
        console.warn(`DOMUtils: Unsupported global event type for removal: ${eventType}`);
        return false;
    },
    
    /**
     * Trigger a custom event
     * @param {string} eventName - Name of the custom event
     * @param {Object} detail - Event detail data
     * @returns {boolean} - Success status
     */
    triggerEvent(eventName, detail = {}) {
        return window.inputManager.dispatchEvent(eventName, detail);
    }
};

console.log("DOMUtils initialized - Use this to standardize InputManager usage across the codebase"); 