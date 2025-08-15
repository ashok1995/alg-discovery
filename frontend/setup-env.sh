#!/bin/bash

# Environment Setup Script
# This script helps you set up environment files for development and production

echo "🚀 Setting up environment files..."

# Check if env.development exists
if [ ! -f "env.development" ]; then
    echo "❌ env.development not found. Please ensure it exists in the frontend directory."
    exit 1
fi

# Check if env.production exists
if [ ! -f "env.production" ]; then
    echo "❌ env.production not found. Please ensure it exists in the frontend directory."
    exit 1
fi

echo "✅ Environment files found!"

# Ask user which environment they want to use
echo ""
echo "Which environment would you like to set up?"
echo "1) Development (env.development)"
echo "2) Production (env.production)"
echo "3) Both"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "📝 Setting up development environment..."
        cp env.development .env
        echo "✅ Development environment configured!"
        echo "💡 Run 'npm run start:dev' to start the development server"
        ;;
    2)
        echo "📝 Setting up production environment..."
        cp env.production .env
        echo "✅ Production environment configured!"
        echo "💡 Run 'npm run build:prod' to build for production"
        ;;
    3)
        echo "📝 Setting up both environments..."
        cp env.development .env.development
        cp env.production .env.production
        echo "✅ Both environments configured!"
        echo "💡 Use 'npm run start:dev' for development"
        echo "💡 Use 'npm run start:prod' for production"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file(s) with your specific values"
echo "2. Install dependencies: npm install"
echo "3. Start development: npm run start:dev"
echo "4. Build for production: npm run build:prod"
echo ""
echo "📚 For more information, see README.md"
