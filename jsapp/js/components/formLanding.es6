import React from 'react';
import PropTypes from 'prop-types';
import reactMixin from 'react-mixin';
import autoBind from 'react-autobind';
import Reflux from 'reflux';
import _ from 'underscore';
import { Link } from 'react-router';
import actions from '../actions';
import bem from '../bem';
import stores from '../stores';
import Select from 'react-select';
import ui from '../ui';
import mixins from '../mixins';
import DocumentTitle from 'react-document-title';
import CopyToClipboard from 'react-copy-to-clipboard';

import {MODAL_TYPES} from '../constants';

import {
  formatTime,
  currentLang,
  assign,
  t,
  log,
  notify
} from '../utils';

export class FormLanding extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      selectedCollectMethod: 'offline_url'
    };
    autoBind(this);
  }
  enketoPreviewModal (evt) {
    evt.preventDefault();
    stores.pageState.showModal({
      type: MODAL_TYPES.ENKETO_PREVIEW,
      assetid: this.state.uid
    });
  }
  callUnarchiveAsset(evt) {
    this.unarchiveAsset();
  }
  renderFormInfo (userCanEdit) {
    var dvcount = this.state.deployed_versions.count;
    var undeployedVersion = undefined;

    if (!this.isCurrentVersionDeployed()) {
      undeployedVersion = `(${t('undeployed')})`;
      dvcount = dvcount + 1;
    }
    return (
        <bem.FormView__cell m={['columns', 'padding']}>
          <bem.FormView__cell>
            <bem.FormView__cell m='version'>
              {dvcount > 0 ? `v${dvcount}` : ''}
            </bem.FormView__cell>
            {undeployedVersion && userCanEdit &&
              <bem.FormView__cell m='undeployed'>
                &nbsp;{undeployedVersion}
              </bem.FormView__cell>
            }
            <bem.FormView__cell m='date'>
              {t('Last Modified')}&nbsp;:&nbsp;
              {formatTime(this.state.date_modified)}&nbsp;-&nbsp;
              <span className='question-count'>
                {this.state.summary.row_count || '0'}&nbsp;
                {t('questions')}
                </span>
            </bem.FormView__cell>
          </bem.FormView__cell>
          <bem.FormView__cell m='buttons'>
            {userCanEdit && this.state.has_deployment && this.state.deployment__active &&
              <a
                className='mdl-button mdl-button--raised mdl-button--colored'
                onClick={this.deployAsset}>
                  {t('redeploy')}
              </a>
            }
            {userCanEdit && !this.state.has_deployment && !this.state.deployment__active &&
              <a
                className='mdl-button mdl-button--raised mdl-button--colored'
                onClick={this.deployAsset}>
                  {t('deploy')}
              </a>
            }
            {userCanEdit && this.state.has_deployment && !this.state.deployment__active &&
              <a
                className='mdl-button mdl-button--raised mdl-button--colored'
                onClick={this.callUnarchiveAsset}>
                  {t('unarchive')}
              </a>
            }
          </bem.FormView__cell>
        </bem.FormView__cell>
      );
  }
  showSharingModal (evt) {
    evt.preventDefault();
    stores.pageState.showModal({
      type: MODAL_TYPES.SHARING,
      assetid: this.state.uid
    });
  }
  showReplaceProjectModal (evt) {
    evt.preventDefault();
    stores.pageState.showModal({
      type: MODAL_TYPES.REPLACE_PROJECT,
      asset: this.state
    });
  }
  isCurrentVersionDeployed() {
    if (
      this.state.deployment__active &&
      this.state.deployed_versions.count > 0 &&
      this.state.deployed_version_id
    ) {
      const deployed_version = this.state.deployed_versions.results.find(
        (version) => {return version.uid === this.state.deployed_version_id}
      )
      return deployed_version.content_hash === this.state.version__content_hash;
    }
    return false;
  }
  isFormRedeploymentNeeded() {
    return !this.isCurrentVersionDeployed() && this.userCan('change_asset', this.state);
  }
  hasLanguagesDefined(translations) {
    return translations && (translations.length > 1 || translations[0] !== null);
  }
  showLanguagesModal (evt) {
    evt.preventDefault();
    stores.pageState.showModal({
      type: MODAL_TYPES.FORM_LANGUAGES,
      asset: this.state
    });
  }
  renderHistory () {
    var dvcount = this.state.deployed_versions.count;
    return (
      <bem.FormView__row className={this.state.historyExpanded ? 'historyExpanded' : 'historyHidden'}>
        <bem.FormView__cell m={['columns', 'history-label']}>
          <bem.FormView__cell m='label'>
            {t('Form history')}
          </bem.FormView__cell>
        </bem.FormView__cell>
        <bem.FormView__cell m={['box', 'history-table']}>
          <bem.FormView__group m='deployments'>
            <bem.FormView__group m={['items', 'headings']}>
              <bem.FormView__label m='version'>{t('Version')}</bem.FormView__label>
              <bem.FormView__label m='date'>{t('Last Modified')}</bem.FormView__label>
              <bem.FormView__label m='clone'>{t('Clone')}</bem.FormView__label>
            </bem.FormView__group>
            {this.state.deployed_versions.results.map((item, n) => {
              return (
                <bem.FormView__group m='items' key={n} >
                  <bem.FormView__label m='version'>
                    {`v${dvcount-n}`}
                    {item.uid === this.state.deployed_version_id && this.state.deployment__active &&
                      <bem.FormView__cell m='deployed'>
                        {t('Deployed')}
                      </bem.FormView__cell>
                    }
                  </bem.FormView__label>
                  <bem.FormView__label m='date'>
                    {formatTime(item.date_deployed)}
                  </bem.FormView__label>
                  <bem.FormView__label m='clone' className='right-tooltip'>
                      <bem.FormView__link m='clone'
                          data-version-id={item.uid}
                          data-tip={t('Clone this version as a new project')}
                          onClick={this.saveCloneAs}>
                        <i className='k-icon-clone' />
                      </bem.FormView__link>
                  </bem.FormView__label>
                </bem.FormView__group>
              );
            })}
          </bem.FormView__group>
        </bem.FormView__cell>
        {this.state.deployed_versions.count > 1 &&
          <bem.FormView__cell m={['centered']}>
            <button className='mdl-button mdl-button--colored' onClick={this.toggleDeploymentHistory}>
              {this.state.historyExpanded ? t('Hide full history') : t('Show full history')}
            </button>
          </bem.FormView__cell>
        }
      </bem.FormView__row>
      );
  }
  renderCollectData () {
    var deployment__links = this.state.deployment__links;

    var available_links = new Map([
        ['offline_url', {
          label: t('Online-Offline (multiple submission)'),
          desc: t('This allows online and offline submissions and is the best option for collecting data in the field. ')
        }],
        ['url', {
          label: t('Online-Only (multiple submissions)'),
          desc: t('This is the best option when entering many records at once on a computer, e.g. for transcribing paper records.')
        }],
        ['single_url', {
          label: t('Online-Only (single submission)'),
          desc: t('This allows a single submission, and can be paired with the "returnURL" parameter to redirect the user to a URL of your choice after the form has been submitted.')
        }],
        ['iframe_url', {
          label: t('Embeddable web form code'),
          desc: t('Use this html5 code snippet to integrate your form on your own website using smaller margins. ')
        }],
        ['preview_url', {
          label: t('View only'),
          desc: t('Use this version for testing, getting feedback. Does not allow submitting data. ')
        }],
        ['android', {
          label: t('Android application'),
          desc: t('Use this option to collect data in the field with your Android device.')
        }],
    ]);

    var deployment__links_list = [];
    available_links.forEach(function (value, key) {
      deployment__links_list.push(
        {
          key: key,
          label: value.label,
          desc: value.desc,
        }
      );
    });

    var chosenMethod = this.state.selectedCollectMethod;

    var kc_server = document.createElement('a');
    kc_server.href = this.state.deployment__identifier;
    var kobocollect_url = kc_server.origin;

    return (
      <bem.FormView__row>
        <bem.FormView__cell m='columns'>
          <bem.FormView__cell m='label'>
              {t('Collect data')}
          </bem.FormView__cell>
        </bem.FormView__cell>
        <bem.FormView__cell m='box'>
          <bem.FormView__cell m={['columns', 'padding']}>
            <bem.FormView__cell>
              <ui.PopoverMenu type='collectData-menu' triggerLabel={available_links.get(chosenMethod).label}>
                {deployment__links_list.map((c)=>{
                  return (
                    <bem.PopoverMenu__link
                      m={['collect-row']}
                      key={`c-${c.key}`}
                      data-method={c.key}
                      onClick={this.setCollectMethod}
                    >
                      <div className='collect-data-label'>{c.label}</div>
                      <div className='collect-data-desc'>{c.desc}</div>
                    </bem.PopoverMenu__link>
                  );
                })}
              </ui.PopoverMenu>
            </bem.FormView__cell>
            <bem.FormView__cell>
              {chosenMethod != 'iframe_url' && chosenMethod != 'android' && this.state.deployment__links[chosenMethod] &&
                <CopyToClipboard text={this.state.deployment__links[chosenMethod]} onCopy={() => notify('copied to clipboard')}>
                  <button className='copy mdl-button mdl-button--colored'>{t('Copy')}</button>
                </CopyToClipboard>
              }
              {chosenMethod != 'iframe_url' && chosenMethod != 'android' &&
                <a className='collect-link mdl-button mdl-button--colored'
                  target='_blank'
                  href={this.state.deployment__links[chosenMethod]}>
                  {t('Open')}
                </a>
              }
              { chosenMethod == 'android' &&
                <a className='collect-link mdl-button mdl-button--colored'
                  target='_blank'
                  href='https://play.google.com/store/apps/details?id=org.koboc.collect.android&hl=en'>
                  {t('Download KoboCollect')}
                </a>
              }
              {chosenMethod == 'iframe_url' &&
                <CopyToClipboard
                  text={`<iframe src=${this.state.deployment__links[chosenMethod]} width="800" height="600"></iframe>`}
                  onCopy={() => notify('copied to clipboard')}>
                  <button className='copy mdl-button mdl-button--colored'>{t('Copy')}</button>
                </CopyToClipboard>
              }
            </bem.FormView__cell>
          </bem.FormView__cell>
          <bem.FormView__cell m={['padding', 'bordertop', 'collect-meta']}>
            {chosenMethod != 'android' &&
              available_links.get(chosenMethod).desc
            }

            {chosenMethod == 'iframe_url' &&
              <pre>
                {`<iframe src=${this.state.deployment__links[chosenMethod]} width="800" height="600"></iframe>`}
              </pre>
            }

            {chosenMethod == 'android' &&
              <ol>
                <li>
                  {t('Install')}
                  &nbsp;
                  <a href='https://play.google.com/store/apps/details?id=org.koboc.collect.android&hl=en' target='_blank'>KoboCollect</a>
                  &nbsp;
                  {t('on your Android device.')}
                </li>
                <li>{t('Click on')} <i className='fa fa-ellipsis-v'/> {t('to open settings.')}</li>
                <li>
                  {t('Enter the server URL')}&nbsp;
                  <code>{kobocollect_url}</code>&nbsp;
                  {t('and your username and password')}
                </li>
                <li>{t('Open "Get Blank Form" and select this project. ')}</li>
                <li>{t('Open "Enter Data."')}</li>
              </ol>
            }

          </bem.FormView__cell>
        </bem.FormView__cell>
      </bem.FormView__row>
    );
  }
  setCollectMethod(evt) {
    this.setState({selectedCollectMethod: evt.currentTarget.dataset.method});
  }
  renderButtons (userCanEdit) {
    let translations = this.state.content.translations;
    var downloadable = false;
    var downloads = [];
    if (this.state.downloads) {
      downloadable = !!this.state.downloads[0];
      downloads = this.state.downloads;
    }

    return (
      <bem.FormView__group m='buttons'>
        {userCanEdit ?
          <Link to={`/forms/${this.state.uid}/edit`}
                className='form-view__link form-view__link--edit'
                data-tip={t('edit')}>
            <i className='k-icon-edit' />
          </Link>
        :
          <bem.FormView__link m={['edit', 'disabled']}
            className='right-tooltip'
            data-tip={t('Editing capabilities not granted, you can only view this form')}>
            <i className='k-icon-edit' />
          </bem.FormView__link>
        }

        <bem.FormView__link m='preview'
          onClick={this.enketoPreviewModal}
          data-tip={t('Preview')}>
          <i className='k-icon-view' />
        </bem.FormView__link>

        {userCanEdit &&
          <bem.FormView__link
            m='upload'
            data-tip={t('Replace form')}
            onClick={this.showReplaceProjectModal}
          >
            <i className='k-icon-replace' />
          </bem.FormView__link>
        }

        <ui.PopoverMenu
          type='formLanding-menu'
          triggerLabel={<i className='k-icon-more' />}
          triggerTip={t('More Actions')}
        >
          {downloads.map((dl)=>{
            return (
                <bem.PopoverMenu__link m={`dl-${dl.format}`} href={dl.url}
                    key={`dl-${dl.format}`}>
                  <i className={`k-icon-${dl.format}-file`}/>
                  {t('Download')}&nbsp;
                  {dl.format.toString().toUpperCase()}
                </bem.PopoverMenu__link>
              );
          })}

          <bem.PopoverMenu__link href='#pdf' className='is-edge'>
            <i className='k-icon-pdf'/>
            {t('Download PDF')}
          </bem.PopoverMenu__link>

          {userCanEdit &&
            <bem.PopoverMenu__link onClick={this.showSharingModal}>
              <i className='k-icon-share'/>
              {t('Share this project')}
            </bem.PopoverMenu__link>
          }

          <bem.PopoverMenu__link onClick={this.saveCloneAs}>
            <i className='k-icon-clone'/>
            {t('Clone this project')}
          </bem.PopoverMenu__link>

          <bem.PopoverMenu__link
            onClick={this.cloneAsTemplate}
            data-asset-uid={this.state.uid}
            data-asset-name={this.state.name}
          >
            <i className='k-icon-template'/>
            {t('Create template')}
          </bem.PopoverMenu__link>

          {userCanEdit && this.state.content.survey.length > 0 &&
            <bem.PopoverMenu__link onClick={this.showLanguagesModal}>
              <i className='k-icon-language'/>
              {t('Manage Translations')}
            </bem.PopoverMenu__link>
          }
        </ui.PopoverMenu>
      </bem.FormView__group>
    );
  }
  renderLanguages (canEdit) {
    let translations = this.state.content.translations;

    return (
      <bem.FormView__cell m={['columns', 'padding', 'bordertop']}>
        <bem.FormView__cell m='translation-list'>
          <strong>{t('Languages:')}</strong>
          &nbsp;
          {!this.hasLanguagesDefined(translations) &&
            t('This project has no languages defined yet')
          }
          {this.hasLanguagesDefined(translations) &&
            <ul>
              {translations.map((langString, n)=>{
                return (
                  <li key={n}>
                    {langString || t('Unnamed language')}
                  </li>
                );
              })}
            </ul>
          }
        </bem.FormView__cell>

        {canEdit &&
          <bem.FormView__cell>
            <bem.FormView__link
              data-tip={t('Manage Translations')}
              onClick={this.showLanguagesModal}>
              <i className='k-icon-language' />
            </bem.FormView__link>
          </bem.FormView__cell>
        }
      </bem.FormView__cell>
    );
  }
  render () {
    var docTitle = this.state.name || t('Untitled');
    const userCanEdit = this.userCan('change_asset', this.state);

    if (this.state.uid == undefined) {
      return (
        <ui.Panel>
          <bem.Loading>
            <bem.Loading__inner>
              <i />
              {t('loading...')}
            </bem.Loading__inner>
          </bem.Loading>
        </ui.Panel>
      );
    }

    return (
      <DocumentTitle title={`${docTitle} | Tehamalab Data Collector`}>
        <bem.FormView m='form'>
          <bem.FormView__row>
            <bem.FormView__cell m={['columns', 'first']}>
              <bem.FormView__cell m='label'>
                {this.state.deployment__active ? t('Current version') :
                  this.state.has_deployment ? t('Archived version') :
                    t('Draft version')}
              </bem.FormView__cell>
              <bem.FormView__cell>
                {this.renderButtons(userCanEdit)}
              </bem.FormView__cell>
            </bem.FormView__cell>
            <bem.FormView__cell m='box'>
              {this.isFormRedeploymentNeeded() &&
                <bem.FormView__cell m='warning'>
                  <i className='k-icon-alert' />
                  {t('If you want to make these changes public, you must deploy this form.')}
                </bem.FormView__cell>
              }
              {this.renderFormInfo(userCanEdit)}
              {this.renderLanguages(userCanEdit)}
            </bem.FormView__cell>
          </bem.FormView__row>
          {this.state.deployed_versions.count > 0 &&
            this.renderHistory()
          }
          {this.state.deployed_versions.count > 0 && this.state.deployment__active &&
            this.renderCollectData()
          }
        </bem.FormView>
      </DocumentTitle>
      );
  }

};

reactMixin(FormLanding.prototype, mixins.permissions);
reactMixin(FormLanding.prototype, mixins.dmix);
reactMixin(FormLanding.prototype, Reflux.ListenerMixin);

FormLanding.contextTypes = {
  router: PropTypes.object
};

export default FormLanding;
