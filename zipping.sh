set -e # exit on error

cp .env build/

echo installing prod dependencies...
cd build
yarn workspaces focus --production
cd ..
echo done

echo zipping...
rm -rf deploy.zip
zip -r deploy.zip build > /dev/null 2>&1
echo done