import React from 'react';
import reactMixin from 'react-mixin';
import autoBind from 'react-autobind';
import Reflux from 'reflux';
import alertify from 'alertifyjs';
import TextBox from 'js/components/textBox';
import bem from 'js/bem';
import stores from 'js/stores';
import actions from 'js/actions';
import {MODAL_TYPES} from 'js/constants';
import {t, getLangAsObject, getLangString, notify} from 'utils';

export class TranslationSettings extends React.Component {
  constructor(props){
    super(props);

    let translations;
    if (props.asset) {
      translations = props.asset.content.translations;
    }

    this.state = {
      assetUid: props.assetUid,
      asset: props.asset,
      translations: translations || [],
      showAddLanguageForm: false,
      isUpdatingDefaultLanguage: false,
      renameLanguageIndex: -1
    };
    autoBind(this);
  }
  componentDidMount () {
    this.listenTo(stores.asset, this.onAssetsChange);

    if (!this.state.asset && this.state.assetUid) {
      if (stores.asset.data[this.state.assetUid]) {
        this.onAssetChange(stores.asset.data[this.state.assetUid]);
      } else {
        stores.allAssets.whenLoaded(this.props.assetUid, this.onAssetChange);
      }
    }
  }
  onAssetChange(asset) {
    this.setState({
      asset: asset,
      translations: asset.content.translations || [],
      showAddLanguageForm: false,
      isUpdatingDefaultLanguage: false,
      renameLanguageIndex: -1
    });

    stores.pageState.showModal({
      type: MODAL_TYPES.FORM_LANGUAGES,
      asset: asset
    });
  }
  onAssetsChange(assetsList) {
    let uid;
    if (this.state.asset) {
      uid = this.state.asset.uid;
    } else if (this.state.assetUid) {
      uid = this.state.assetUid;
    }
    this.onAssetChange(assetsList[uid]);
  }
  showAddLanguageForm() {
    this.setState({
      showAddLanguageForm: true
    });
  }
  hideAddLanguageForm() {
    this.setState({
      showAddLanguageForm: false
    });
  }
  toggleRenameLanguageForm(evt) {
    const index = parseInt(evt.currentTarget.dataset.index);
    if (this.state.renameLanguageIndex === index) {
      this.setState({
        renameLanguageIndex: -1
      });
    } else {
      this.setState({
        renameLanguageIndex: index
      });
    }
  }
  launchTranslationTableModal(evt) {
    const index = evt.currentTarget.dataset.index;
    stores.pageState.switchModal({
      type: MODAL_TYPES.FORM_TRANSLATIONS_TABLE,
      asset: this.state.asset,
      langIndex: index
    });
  }
  onLanguageChange(lang, index) {
    let content = this.state.asset.content;
    const langString = getLangString(lang);

    if (index > -1) {
      content.translations[index] = langString;
    } else {
      content.translations.push(langString);
      content = this.prepareTranslations(content);
    }

    if (index === 0) {
      content.settings.default_language = langString;
    }

    this.updateAsset(content);
  }
  canAddLanguages() {
    return !(this.state.translations.length === 1 && this.state.translations[0] === null);
  }
  getAllLanguages() {
    return this.state.translations;
  }
  deleteLanguage(evt) {
    const index = evt.currentTarget.dataset.index;
    const content = this.deleteTranslations(this.state.asset.content, index);
    if (content) {
      content.translations.splice(index, 1);
      const dialog = alertify.dialog('confirm');
      const opts = {
        title: t('Delete language?'),
        message: t('Are you sure you want to delete this language? This action is not reversible.'),
        labels: {ok: t('Delete'), cancel: t('Cancel')},
        onok: () => {
          this.updateAsset(content);
          dialog.destroy();
        },
        oncancel: () => {dialog.destroy();}
      };
      dialog.set(opts).show();
    } else {
      notify('Error: translation index mismatch. Cannot delete language.');
    }
  }
  prepareTranslations(content) {
    let translated = content.translated,
        translationsLength = content.translations.length,
        survey = content.survey,
        choices = content.choices;

    // append null values to translations for each survey row
    for (let i = 0, len = survey.length; i < len; i++) {
      let row = survey[i];
      for (let j = 0, len2 = translated.length; j < len2; j++) {
        var property = translated[j];
        if (row[property] && row[property].length < translationsLength) {
          row[property].push(null);
        }
      }
    }

    // append null values to translations for choices
    if (content.choices && content.choices.length) {
      for (let i = 0, len = choices.length; i < len; i++) {
        if (choices[i].label.length < translationsLength) {
          choices[i].label.push(null);
        }
      }
    }
    return content;
  }
  deleteTranslations(content, langIndex) {
    let translated = content.translated,
        translationsLength = content.translations.length,
        survey = content.survey,
        choices = content.choices;

    for (let i = 0, len = survey.length; i < len; i++) {
      let row = survey[i];
      for (let j = 0, len2 = translated.length; j < len2; j++) {
        var property = translated[j];
        if (row[property]) {
          if (row[property].length === translationsLength) {
            row[property].splice(langIndex, 1);
          } else {
            console.error('Translations index mismatch');
            return false;
          }
        }
      }
    }

    if (content.choices && content.choices.length) {
      for (let i = 0, len = choices.length; i < len; i++) {
        if (choices[i].label) {
          if (choices[i].label.length === translationsLength) {
            choices[i].label.splice(langIndex, 1);
          } else {
            console.error('Translations index mismatch');
            return false;
          }
        }
      }
    }
    return content;
  }
  changeDefaultLanguage(evt) {
    const index = evt.currentTarget.dataset.index;
    const langString = this.state.translations[index];

    const dialog = alertify.dialog('confirm');
    const opts = {
      title: t('Change default language?'),
      message: t('Are you sure you would like to set ##lang## as the default language for this form?').replace('##lang##', langString),
      labels: {ok: t('Confirm'), cancel: t('Cancel')},
      onok: () => {
        this.setState({isUpdatingDefaultLanguage: true});
        const content = this.state.asset.content;
        content.settings.default_language = langString;
        this.updateAsset(content);
        dialog.destroy();
      },
      oncancel: () => {dialog.destroy();}
    };
    dialog.set(opts).show();
  }
  updateAsset (content) {
    actions.resources.updateAsset(
      this.state.asset.uid,
      {content: JSON.stringify(content)},
      // reload asset on failure
      {onFailed: () => {
        actions.resources.loadAsset({id: this.state.asset.uid});
        alertify.error('failed to update translations');
      }}
    );
  }
  renderEmptyMessage() {
    return (
      <bem.FormModal m='translation-settings'>
        <bem.FormModal__item>
          <bem.FormView__cell>
            {t('There is nothing to translate in this form.')}
          </bem.FormView__cell>
        </bem.FormModal__item>
      </bem.FormModal>
    );
  }
  renderLoadingMessage() {
    return (
      <bem.Loading>
        <bem.Loading__inner>
          <i />
          {t('loading...')}
        </bem.Loading__inner>
      </bem.Loading>
    );
  }
  renderTranslationsSettings(translations) {
    return (
      <bem.FormModal m='translation-settings'>
        <bem.FormModal__item>
          {(translations && translations[0] === null) ?
            <bem.FormView__cell m='translation-note'>
              <p>{t('Here you can add more languages to your project, and translate the strings in each of them.')}</p>
              <p><strong>{t('Please name your default language before adding languages and translations.')}</strong></p>
              <p>{t('For the language code field, we suggest using the')}
                <a target='_blank' href='https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry'>
                  {' ' + t('official language code') + ' '}
                </a>
                {t('(e.g. "English (en)" or "Rohingya (rhg)").')}
                <a target='_blank' href='http://support.kobotoolbox.org/creating-forms/adding-another-language-to-your-form-in-the-project-dashboard'>
                  {' ' + t('Read more.')}
                </a>
              </p>
            </bem.FormView__cell>
            :
            <bem.FormView__cell m='label'>
              {t('Current languages')}
            </bem.FormView__cell>
          }
          {translations.map((l, i) => {
            return (
              <React.Fragment key={`lang-${i}`}>
                <bem.FormView__cell m='translation'>
                  <bem.FormView__cell m='translation-name'>
                    {l ? l : t('Unnamed language')}

                    {i === 0 &&
                      <bem.FormView__label m='default-language'>
                        {t('default')}
                      </bem.FormView__label>
                    }

                    {i !== 0 &&
                      <bem.FormView__iconButton
                        data-index={i}
                        onClick={this.changeDefaultLanguage}
                        disabled={this.state.isUpdatingDefaultLanguage}
                        data-tip={t('Make default')}
                      >
                        <i className='k-icon-language-default' />
                      </bem.FormView__iconButton>
                    }
                  </bem.FormView__cell>

                  <bem.FormView__cell m='translation-actions'>
                    <bem.FormView__iconButton
                      data-index={i}
                      onClick={this.toggleRenameLanguageForm}
                      disabled={this.state.isUpdatingDefaultLanguage}
                      data-tip={t('Edit language')}
                      className='right-tooltip'
                    >
                      {this.state.renameLanguageIndex === i &&
                        <i className='k-icon-close' />
                      }
                      {this.state.renameLanguageIndex !== i &&
                        <i className='k-icon-edit' />
                      }
                    </bem.FormView__iconButton>

                    {i !== 0 &&
                      <React.Fragment>
                        <bem.FormView__iconButton
                          data-index={i}
                          onClick={this.launchTranslationTableModal}
                          disabled={this.state.isUpdatingDefaultLanguage}
                          data-tip={t('Update translations')}
                          className='right-tooltip'
                        >
                          <i className='k-icon-globe-alt' />
                        </bem.FormView__iconButton>

                        <bem.FormView__iconButton
                          data-index={i}
                          onClick={this.deleteLanguage}
                          disabled={this.state.isUpdatingDefaultLanguage}
                          data-tip={t('Delete language')}
                          className='right-tooltip'
                        >
                          <i className='k-icon-trash' />
                        </bem.FormView__iconButton>
                      </React.Fragment>
                    }
                  </bem.FormView__cell>
                </bem.FormView__cell>

                {this.state.renameLanguageIndex === i &&
                  <bem.FormView__cell m='update-language-form'>
                    <LanguageForm
                      langString={l}
                      langIndex={i}
                      onLanguageChange={this.onLanguageChange}
                      existingLanguages={this.getAllLanguages(l)}
                    />
                  </bem.FormView__cell>
                }
              </React.Fragment>
            );
          })}
          {!this.state.showAddLanguageForm &&
            <bem.FormView__cell m='add-language'>
              <button
                className='mdl-button mdl-js-button mdl-button--raised mdl-button--colored'
                onClick={this.showAddLanguageForm}
                disabled={!this.canAddLanguages()}
              >
                {t('Add language')}
              </button>
            </bem.FormView__cell>
          }
          {this.state.showAddLanguageForm &&
            <bem.FormView__cell m='add-language-form'>
              <bem.FormView__link m='close' onClick={this.hideAddLanguageForm}>
                <i className='k-icon-close' />
              </bem.FormView__link>
              <bem.FormView__cell m='label'>
                {t('Add a new language')}
              </bem.FormView__cell>
              <LanguageForm
                onLanguageChange={this.onLanguageChange}
                existingLanguages={this.getAllLanguages()}
              />
            </bem.FormView__cell>
          }
        </bem.FormModal__item>
      </bem.FormModal>
    );
  }
  render () {
    if (!this.state.asset) {
      return this.renderLoadingMessage();
    }

    let translations = this.state.translations;
    if (translations.length === 0) {
      return this.renderEmptyMessage();
    } else {
      return this.renderTranslationsSettings(translations);
    }
  }
}

reactMixin(TranslationSettings.prototype, Reflux.ListenerMixin);

export default TranslationSettings;

/*
Properties:
- langString <string>: follows pattern "NAME (CODE)"
- langIndex <string>
- onLanguageChange <function>: required
- existingLanguages <langString[]>: for validation purposes
*/
class LanguageForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      nameError: null,
      code: '',
      codeError: null
    };

    if (this.props.langString) {
      const lang = getLangAsObject(this.props.langString);

      if (lang) {
        this.state = {
          name: lang.name || '',
          code: lang.code || ''
        };
      } else {
        // if language isn't in "English (en)" format, assume it is a simple language name string
        this.state = {
          name: this.props.langString,
          code: ''
        };
      }
    }
    autoBind(this);
  }
  isLanguageNameValid() {
    if (this.props.existingLanguages) {
      let isNameUnique = true;
      this.props.existingLanguages.forEach((langString) => {
        if (this.props.langString && langString === this.props.langString) {
          // skip comparing to itself (editing language context)
        } else if (langString !== null) {
          const langObj = getLangAsObject(langString);
          if (langObj && langObj.name === this.state.name) {
            isNameUnique = false;
          }
        }
      });
      return isNameUnique;
    } else {
      return true;
    }
  }
  isLanguageCodeValid() {
    if (this.props.existingLanguages) {
      let isCodeUnique = true;
      this.props.existingLanguages.forEach((langString) => {
        if (this.props.langString && langString === this.props.langString) {
          // skip comparing to itself (editing language context)
        } else if (langString !== null) {
          const langObj = getLangAsObject(langString);
          if (langObj && langObj.code === this.state.code) {
            isCodeUnique = false;
          }
        }
      });
      return isCodeUnique;
    } else {
      return true;
    }
  }
  onSubmit(evt) {
    evt.preventDefault();

    const isNameValid = this.isLanguageNameValid();
    if (!isNameValid) {
      this.setState({nameError: t('Name must be unique!')});
    } else {
      this.setState({nameError: null});
    }

    const isCodeValid = this.isLanguageCodeValid();
    if (!isCodeValid) {
      this.setState({codeError: t('Code must be unique!')});
    } else {
      this.setState({codeError: null});
    }

    if (isNameValid && isCodeValid) {
      let langIndex = -1;
      if (this.props.langIndex !== undefined) {
        langIndex = this.props.langIndex;
      }
      this.props.onLanguageChange({
        name: this.state.name,
        code: this.state.code
      }, langIndex);
    }
  }
  onNameChange (newName) {
    this.setState({name: newName.trim()});
  }
  onCodeChange (newCode) {
    this.setState({code: newCode.trim()});
  }
  render () {
    let isAnyFieldEmpty = this.state.name.length === 0 || this.state.code.length === 0;

    return (
      <bem.FormView__form m='add-language-fields'>
        <bem.FormView__cell m='lang-name'>
          <bem.FormModal__item>
            <label>{t('Language name')}</label>
            <TextBox
              value={this.state.name}
              onChange={this.onNameChange}
              errors={this.state.nameError}
            />
          </bem.FormModal__item>
        </bem.FormView__cell>

        <bem.FormView__cell m='lang-code'>
          <bem.FormModal__item>
            <label>{t('Language code')}</label>
            <TextBox
              value={this.state.code}
              onChange={this.onCodeChange}
              errors={this.state.codeError}
            />
          </bem.FormModal__item>
        </bem.FormView__cell>

        <bem.FormView__cell m='submit-button'>
          <button
            className='mdl-button mdl-js-button mdl-button--raised mdl-button--colored'
            onClick={this.onSubmit} type='submit'
            disabled={isAnyFieldEmpty}
          >
            {this.props.langIndex !== undefined ? t('Update') : t('Add')}
          </button>
        </bem.FormView__cell>
      </bem.FormView__form>
      );
  }
}
