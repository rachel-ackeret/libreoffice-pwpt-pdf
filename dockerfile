FROM public.ecr.aws/lambda/nodejs:20-x86_64

COPY package.json ${LAMBDA_TASK_ROOT}/
RUN npm install
COPY handler.js ${LAMBDA_TASK_ROOT}/
CMD [ "handler.handler" ]

ENV PATH=/var/lang/bin:/usr/local/bin:/usr/bin/:/bin:/opt/bin

# Configure linker to correctly point to libraries
ENV LD_LIBRARY_PATH="/usr/lib:/usr/lib64"
RUN dnf install -y xorg-x11-fonts-* libSM.x86_64 libXinerama-devel google-noto-sans-cjk-fonts binutils tar gzip xz \
                    openssl nss-tools dbus-libs cups-libs && dnf clean all

RUN cp /lib64/libssl.so.3 /lib64/libssl3.so

RUN mkdir ~/libre && cd ~/libre && curl -s -L https://download.documentfoundation.org/libreoffice/stable/7.6.7/rpm/x86_64/LibreOffice_7.6.7_Linux_x86-64_rpm.tar.gz | tar xvz

RUN cd ~/libre/LibreOffice_7.6.7.2_Linux_x86-64_rpm/RPMS/ && rpm -Uvh *.rpm && rm -fr ~/libre

ENV HOME=/tmp

# Trigger dummy run to generate bootstrap files to improve cold start performance
RUN touch /tmp/test.txt \
    && cd /tmp \
    && libreoffice7.6 --headless --invisible --nodefault --view \
        --nolockcheck --nologo --norestore --convert-to pdf \
        --outdir /tmp /tmp/test.txt \
    && rm /tmp/test.*