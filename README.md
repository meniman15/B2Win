# B2Win Marketplace 🚀

B2Win is a modern, high-fidelity internal marketplace designed for organizations and departments to trade, share, and manage products and assets. Built with a focus on speed, aesthetics, and user experience.

![Project Preview](https://raw.githubusercontent.com/meniman15/B2Win/main/client/src/assets/Bitwin_logo_final.png)

## 📸 Screenshots

<p align="center">
  <img src="./client/src/assets/Screenshot%202026-04-13%20at%2017.17.46.png" width="45%" alt="Personal Page View" />
  <img src="./client/src/assets/Screenshot%202026-04-13%20at%2017.18.07.png" width="45%" alt="Product Modal" />
</p>

## ✨ Features

- **🛍️ Product Discovery**: Browse products by category (Computers, Infrastructure, Furniture, etc.) with a clean, grid-based interface.
- **🔍 Smart Search**: Real-time, debounced search with category-aware autocompletion.
- **📝 Detailed Product Views**: Deep-dive into product specifications, manufacturer details, and FAQs through an elegant, blurred-background modal.
- **🤝 Interest Management**: 
  - **Show Interest**: Submit your interest in a product with custom messages and quantities.
  - **Cancel Interest**: Easily remove interest with a single click.
  - **Dynamic Feedback**: Real-time status updates and animated success/cancellation messages.
- **❤️ Favorites & Likes**: Save products you're interested in for later (coming soon).
- **📢 Advertise Products**: List new items into the organizational marketplace (coming soon).
- **🔐 Secure Authentication**: Professional login and registration flow with organization-specific fields.

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite**
- **Tailwind CSS** for premium, responsive styling.
- **Framer Motion** for smooth, high-end animations.
- **Lucide React** for consistent, modern iconography.

### Backend
- **Node.js** + **Express**
- **TypeScript** for end-to-end type safety.
- **Origami API** (Planned integration) for robust data management.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/meniman15/B2Win.git
   cd B2Win
   ```

2. **Setup the Server**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Setup the Client**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

## 📐 Architecture

- `/client`: React application with Vite, containing all UI components and custom hooks.
- `/server`: Express server with TypeScript, handling API endpoints and data logic.
- `/brain`: Project documentation and implementation plans (Internal).

## 📄 License
Internal Organizational Project.

---
*Built with ❤️ for the B2Win Team.*
